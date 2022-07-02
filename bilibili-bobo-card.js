// ==UserScript==
// @name         Bilibili 啵啵动态卡片 - bilibili.com
// @namespace    https://github.com/milkiq
// @match        https://*.bilibili.com/*
// @version      1.0
// @author       aqqqq
// @grant        unsafeWindow
// @grant        GM_getValue
// @grant        GM_setValue
// @description  把给三三点赞的人卡片换成三三的图案
// ==/UserScript==

(function () {
  'use strict';
  console.log(unsafeWindow.xhook, xhook, '?????');
  const allUids = GM_getValue('bobo_liker_uids');


  function uidMatch(uid) {
    if (uid === 33605910) return true;
    return allUids.some(id => id === uid);
  }

  function injectDynamicItem(item) {
    const uid = item?.modules?.module_author?.mid;
    if (!uidMatch(uid)) return;

    const number = uid === 33605910 ? 1 : (uid + '').slice(-6);
    item.modules.module_author.decorate = {
        "card_url": "https://i0.hdslb.com/bfs/new_dyn/a3c6601ddcf82030e4e3bd3ebf148e411320060365.png",
        "fan": {
            "color": "#ff7373",
            "is_fan": true,
            "num_str": number,
            "number": +number
        },
        "id": 33521,
        "jump_url": "https://space.bilibili.com/33605910",
        "name": "三三与她的小桂物",
        "type": 3
    };
  }
  // 动态直接通过 Hook XHR 响应完成
  unsafeWindow.xhook.after(function(request, response) {
    if (request.url.includes('//api.bilibili.com/x/polymer/web-dynamic/v1/detail')) {
      if (request.url.includes('timezone_offset')) {
        // 动态详情页
        let response_json = JSON.parse(response.text);
        injectDynamicItem(response_json.data.item);
        response.text = JSON.stringify(response_json);
      }
    } else if (
      request.url.includes('//api.bilibili.com/x/polymer/web-dynamic/v1/feed/space') ||
      request.url.includes('//api.bilibili.com/x/polymer/web-dynamic/v1/feed/all')
    ) {
        // 主时间线和个人主页
        let response_json = JSON.parse(response.text);
        for (let i in response_json.data.items) {
            injectDynamicItem(response_json.data.items[i]);
        }
        response.text = JSON.stringify(response_json);
    } else if (request.url.includes('//app.bilibili.com/x/topic/web/details/cards')) {
        // 话题页
        let response_json = JSON.parse(response.text);
        for (let i in response_json.data.topic_card_list.items) {
            let item = response_json.data.topic_card_list.items[i]
            if (item.topic_type == 'DYNAMIC') {
                injectDynamicItem(item.dynamic_card_item);
            }
        }
        response.text = JSON.stringify(response_json);
    } else if (request.url.includes('//api.bilibili.com/x/v2/reply/main')) {
        let response_json = JSON.parse(response.text);
        for (let i in response_json.data.replies) {
          response_json.data.replies[i].member.user_sailing.cardbg = {
              "id": 35902,
              "name": "向晚个性装扮2.0",
              "image": "http://i0.hdslb.com/bfs/garb/item/4e0c08c792796ccf411a6ece9f3fbe221e1ebb95.png",
              "jump_url": "https://www.bilibili.com/h5/mall/fans/recommend/35906?navhide=1&mid=51000514&from=reply",
              "fan": {
                  "is_fan": 1,
                  "number": 7657,
                  "color": "#5b7cf9",
                  "name": "向晚个性装扮2.0",
                  "num_desc": "007657"
              },
              "type": "suit"
          }
        }
        response.text = JSON.stringify(response_json);
    }
  });

  function sleep(times) {
    return new Promise(resolve => {
      setTimeout(() => resolve(), times);
    });
  }

  async function getLikersUid(tid) {
    const res = await fetch(`https://api.bilibili.com/x/polymer/web-dynamic/v1/detail?id=${tid}&`).then(res => res.json());
    const likes = res.data.item.modules.module_stat.like.count;
    let uids = [];
    let actions = [];
    for (let i = 1; (i - 1) * 20 < likes; i++) {
      actions.push(
        fetch(`https://api.vc.bilibili.com/dynamic_like/v1/dynamic_like/spec_item_likes?dynamic_id=${tid}&pn=${i}&ps=20`)
          .then(response => response.json())
          .then(res => {
            return res.data?.item_likes?.map(e => e.uid) ?? [];
          })
      );
      if (actions.length >= 100) {
        const results = await Promise.all(actions);
        console.log(results, '<<<<<');
        uids = uids.concat(...results);
        actions = [];
        await sleep(1000);
      }
    }
    GM_setValue('bobo_liker_uids', uids);
  }

  if (location.hostname === 't.bilibili.com') {
    let boboListUpdating = false;
    const settingBtnEl = unsafeWindow.document.createElement("div");
    settingBtnEl.innerHTML = `
        <div
          style="
            width: 50px;
            height: 50px;
            border-radius:10px;
            position:fixed;
            bottom: 30px;
            left: 30px;
            border: 1px #000 solid;
            z-index: 9999;
            background-image: url(https://i0.hdslb.com/bfs/face/6bd8870432b9c0fffc755bf29de03856df6d9efe.jpg);
            background-size: 100% 100%;"
          id="bobo-settings-btn"
        >
        </div>
    `;
    
    function createWrapper() {
      const wrapperEl = document.createElement('div');
      wrapperEl.setAttribute('id', 'bobo-card-settings-dialog-wrapper');
      wrapperEl.setAttribute('style', 'width: 100%;height: 100%;position:fixed;top: 0;left: 0;background: rgba(0,0,0,0.5);z-index: 10000;justify-content: center;align-items: center;display: flex;');
      wrapperEl.innerHTML = `
          <div id="bobo-card-settings-dialog-body" style="width: 400px;height: 300px;background: #fff;border-radius:10px;padding: 30px;">
            <button id="bobo-card-update-likes">更新啵版点赞列表</button>
            <div id="bobo-card-update-text" style="width: 100%; height: 100px;margin: 40px 0 80px 0;"></div>
            <button id="bobo-card-setting-cancel" style="float: right;">退出设置</button>
          </div>
      `;
      unsafeWindow.document.body.appendChild(wrapperEl);
      let updateBtn = unsafeWindow.document.getElementById('bobo-card-update-likes');
      let cancelBtn = unsafeWindow.document.getElementById('bobo-card-setting-cancel');
      updateBtn.addEventListener('click', async () => {
        boboListUpdating = true;
        const el = unsafeWindow.document.getElementById('bobo-card-update-text');
        el.innerText = '正在获取列表，请稍等…';
        await getLikersUid('662016827293958168');
        el.innerText = '获取成功！';
        boboListUpdating = false;
      });
      unsafeWindow.document.getElementById('bobo-card-setting-cancel').addEventListener('click', () => {
        if (boboListUpdating) {
          alert('正在更新中，请勿退出，关闭页面会导致更新失败');
          return;
        }
        wrapperEl.remove();
      });
    }

    unsafeWindow.document.body.appendChild(settingBtnEl);
    
    settingBtnEl.addEventListener('click', () => {
      createWrapper(settingBtnEl);
    });
  }
})();
