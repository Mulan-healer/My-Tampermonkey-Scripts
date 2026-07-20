// ==UserScript==
// @name         AList mpv 链接精准解码器 (直达版)
// @namespace    http://tampermonkey.net/
// @version      0.6
// @description  一键获取 AList mpv 直链：直接解析元素链接，免点击免剪贴板读取
// @author       Gemini
// @match        *://localhost:5244/*
// @grant        GM_setClipboard
// @grant        GM_notification
// ==/UserScript==

(function() {
    'use strict';

    function preciseDecode(text) {
        let url = text.replace(/^mpv:\/\//, "");
        return decodeURIComponent(url);
    }

    let btn = document.createElement("button");
    btn.innerHTML = "🔗 获取 mpv 直链";
    btn.style = "position:fixed;bottom:20px;left:20px;z-index:9999;padding:10px 15px;background:#28a745;color:white;border:none;border-radius:5px;cursor:pointer;box-shadow:0 4px 6px rgba(0,0,0,0.2);font-weight:bold;";
    document.body.appendChild(btn);

    btn.onclick = () => {
        try {
            // 1. 查找原生 mpv 按钮的图片
            const mpvImg = document.querySelector('img[src="/images/mpv.webp"]');

            if (!mpvImg) {
                alert("未找到 MPV 按钮，请确保当前在视频页面且已加载完毕。");
                return;
            }

            // 2. 向上寻找包裹该图片的 <a> 标签
            const linkElement = mpvImg.closest('a');

            if (!linkElement || !linkElement.href) {
                alert("找到了图标，但未能在其身上找到链接地址，可能是 AList 页面结构已更改。");
                return;
            }

            // 3. 直接获取原生的 mpv:// 链接
            const rawUrl = linkElement.href;

            if (rawUrl.includes("mpv://")) {
                // 4. 解码
                const finalUrl = preciseDecode(rawUrl);

                // 5. 写入剪贴板 (此时不需要读取剪贴板，只需要写入)
                GM_setClipboard(finalUrl);

                GM_notification({
                    text: "直链提取成功！已存入剪贴板，请直接在 mpv 粘贴播放。",
                    title: "解码助手",
                    timeout: 3000
                });
            } else {
                alert("获取失败：该按钮的链接不是 mpv:// 协议。");
            }
        } catch (err) {
            alert("发生错误：" + err.message);
            console.error(err);
        }
    };
})();
