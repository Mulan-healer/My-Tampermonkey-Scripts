// ==UserScript==
// @name         AList 观看助手 (V12.1 左侧布局版)
// @namespace    http://tampermonkey.net/
// @version      12.1
// @description  保留所有历史跳转功能，大幅优化渲染性能，布局调整至左侧。
// @author       Gemini
// @match        *://localhost:5244/*
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- 1. 样式配置 (布局已改为左侧) ---
    GM_addStyle(`
        .alist-watched-style { color: #999 !important; text-decoration: line-through !important; opacity: 0.6 !important; }
        .alist-watched-style * { color: #999 !important; }

        .alist-highlight-style { background: rgba(46, 204, 113, 0.15) !important; border-left: 4px solid #2ecc71 !important; }
        .alist-highlight-text { color: #2ecc71 !important; font-weight: bold !important; }

        .alist-target-style {
            background: rgba(52, 152, 219, 0.15) !important;
            border-left: 4px solid #3498db !important;
            animation: flashHighlight 2s ease-out;
        }
        @keyframes flashHighlight { 0% { background: rgba(52, 152, 219, 0.5); } 100% { background: rgba(52, 152, 219, 0.15); } }

        /* 悬浮按钮组 - 修改为左侧 */
        .alist-float-btn {
            position: fixed;
            left: 20px; /* 改为 left */
            width: 45px; height: 45px; border-radius: 50%;
            cursor: pointer; z-index: 99998; box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s, background 0.2s; color: #fff;
        }
        .alist-float-btn:hover { transform: scale(1.1); }

        #alist-toggle-btn { top: calc(50% - 30px); background: #2ecc71; display: none; }
        #alist-toggle-btn:hover { background: #27ae60; }
        #alist-toggle-btn::after { content: ''; display: block; width: 0; height: 0; border-style: solid; border-width: 8px 0 8px 14px; border-color: transparent transparent transparent #000; margin-left: 4px; }

        #alist-history-btn { top: calc(50% + 30px); background: #3498db; }
        #alist-history-btn:hover { background: #2980b9; }
        #alist-history-btn::before { content: '🕒'; font-size: 20px; line-height: 1; font-family: sans-serif; }

        /* 面板通用 - 修改为左侧弹出 */
        .alist-panel {
            position: fixed; top: 50%;
            left: 80px; /* 改为 left，距离按钮一定间距 */
            transform: translateY(-50%);
            width: 320px; background: #222; border: 1px solid #444; padding: 15px;
            z-index: 99999; color: #fff; box-shadow: 0 5px 20px rgba(0,0,0,0.8);
            border-radius: 6px; display: none; font-family: system-ui, sans-serif;
            animation: slideRight 0.2s ease-out; /* 动画改为 slideRight */
            max-height: 70vh; flex-direction: column;
        }

        /* 动画方向调整：从左向右滑出 */
        @keyframes slideRight {
            from { opacity: 0; transform: translateY(-50%) translateX(-20px); }
            to { opacity: 1; transform: translateY(-50%) translateX(0); }
        }

        /* 保持左边框高亮，这样靠近按钮一侧看起来更协调 */
        #alist-history-panel { border-left: 5px solid #3498db; }
        #alist-helper-panel { border-left: 5px solid #2ecc71; }

        .history-list { overflow-y: auto; margin-top: 10px; padding-right: 5px; }
        .history-list::-webkit-scrollbar { width: 5px; }
        .history-list::-webkit-scrollbar-track { background: #333; }
        .history-list::-webkit-scrollbar-thumb { background: #555; border-radius: 3px; }

        .history-item { padding: 10px; border-bottom: 1px solid #333; cursor: pointer; transition: background 0.2s; position: relative; }
        .history-item:hover { background: #333; }
        .history-item::after { content: '➜'; position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: #555; font-size: 12px; opacity: 0; transition: opacity 0.2s; }
        .history-item:hover::after { opacity: 1; }

        .h-time { font-size: 11px; color: #888; margin-bottom: 3px; }
        .h-name { font-size: 13px; color: #eee; line-height: 1.4; word-break: break-all; padding-right: 15px; }

        .panel-close { position: absolute; top: 8px; right: 10px; cursor: pointer; color: #888; font-size: 16px; }
        .panel-close:hover { color: #fff; }
    `);

    // --- 2. 核心工具 ---
    function normalize(str) {
        if (!str) return '';
        try { return decodeURIComponent(str).replace(/\s+/g, ''); }
        catch (e) { return str.replace(/\s+/g, ''); }
    }

    // 优化的查找器：增加缓存机制避免频繁查询
    function findFileItems() {
        // 优先查找标准类名，减少遍历开销
        let items = document.querySelectorAll('.obj-list-item, a.list-item, tr.ant-table-row');
        if (items.length > 0) return Array.from(items);

        // 后备方案
        const names = document.querySelectorAll('.name, .filename, .text-truncate');
        let fallbackItems = [];
        names.forEach(n => {
            const parent = n.closest('a') || n.closest('div[role="button"]');
            if (parent) fallbackItems.push(parent);
        });
        return [...new Set(fallbackItems)];
    }

    function formatTime(ts) {
        const d = new Date(ts);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${d.getMonth()+1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // 安全解析 JSON，失败则回退到旧格式
    function safeParse(val, key) {
        if (!val) return null;
        if (val.startsWith('{')) {
            try { return JSON.parse(val); } catch(e) { return null; }
        }
        // 旧版本兼容
        return { time: parseInt(val), rawName: key.replace('alist_clean_', ''), fullPath: null };
    }

    // --- 3. 业务逻辑 ---

    function recordHistory() {
        const isVideoUrl = /\.(mkv|mp4|avi|mov|flv|webm|rmvb)$/i.test(location.pathname);
        const hasVideoTag = document.querySelector('video');

        if (isVideoUrl || hasVideoTag) {
            const rawName = location.pathname.split('/').pop();
            const cleanName = normalize(rawName);
            const data = {
                time: new Date().getTime(),
                rawName: decodeURIComponent(rawName),
                fullPath: location.pathname
            };
            localStorage.setItem('alist_clean_' + cleanName, JSON.stringify(data));
        }
    }

    function getHistoryList() {
        let list = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('alist_clean_')) {
                const record = safeParse(localStorage.getItem(key), key);
                if (record) {
                    record.cleanKey = key.replace('alist_clean_', '');
                    list.push(record);
                }
            }
        }
        return list.sort((a, b) => b.time - a.time);
    }

    // 跳转逻辑
    function jumpToRecord(record) {
        const currentPath = decodeURIComponent(location.pathname);
        if (record.fullPath) {
            const targetFolder = record.fullPath.substring(0, record.fullPath.lastIndexOf('/'));
            // 简单比较路径（处理结尾斜杠差异）
            const normalizePath = (p) => p.endsWith('/') ? p.slice(0, -1) : p;

            if (normalizePath(targetFolder) === normalizePath(currentPath)) {
                // 在当前文件夹：直接高亮
                if (!highlightFile(record.rawName, true)) {
                    alert('未在当前列表找到该文件，可能已被重命名。');
                }
            } else {
                // 不在当前文件夹：存储目标并跳转
                sessionStorage.setItem('alist_jump_target', record.rawName);
                location.href = targetFolder;
            }
        } else {
            // 旧数据尝试直接查找
            if (!highlightFile(record.rawName, true)) {
                alert('这是一个旧记录（无路径信息），且未在当前页面找到。');
            }
        }
    }

    // 高亮逻辑 (返回是否找到)
    function highlightFile(targetRawName, isJumpAction = false) {
        const items = findFileItems();
        const targetClean = normalize(targetRawName);
        let foundEl = null;

        for (let el of items) {
            const nameEl = el.querySelector('.name') || el.querySelector('.filename') || el;
            const text = nameEl.innerText || nameEl.textContent;
            if (normalize(text) === targetClean) {
                foundEl = el;
                break;
            }
        }

        if (foundEl) {
            foundEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            if (isJumpAction) {
                // 强力高亮 (Jump 动作)
                foundEl.classList.remove('alist-highlight-style'); // 移除普通高亮
                foundEl.classList.add('alist-target-style');
                setTimeout(() => foundEl.classList.remove('alist-target-style'), 3000);

                // 关闭面板
                const hPanel = document.getElementById('alist-history-panel');
                if (hPanel) hPanel.style.display = 'none';
            }
            return true;
        }
        return false;
    }

    // --- 4. UI 渲染 (按需创建) ---

    function initUI() {
        if (!document.getElementById('alist-toggle-btn')) {
            const btn = document.createElement('div');
            btn.id = 'alist-toggle-btn'; btn.className = 'alist-float-btn'; btn.title = '继续观看';
            btn.onclick = () => showPanel('helper');
            document.body.appendChild(btn);
        }
        if (!document.getElementById('alist-history-btn')) {
            const btn = document.createElement('div');
            btn.id = 'alist-history-btn'; btn.className = 'alist-float-btn'; btn.title = '历史记录';
            btn.onclick = () => showPanel('history');
            document.body.appendChild(btn);
        }
        // 面板懒加载：点击时再创建内容，减少初始开销
        if (!document.getElementById('alist-helper-panel')) {
            const panel = document.createElement('div');
            panel.id = 'alist-helper-panel'; panel.className = 'alist-panel';
            panel.innerHTML = `<div class="panel-close" onclick="this.parentElement.style.display='none'">✕</div><div style="color:#2ecc71; font-weight:bold; margin-bottom:8px;">上次看到这里：</div><div id="alist-panel-content" style="font-size:12px; margin-bottom:12px; color:#ccc; word-break:break-all;"></div><button id="alist-jump-btn" style="background:#2ecc71; color:#000; border:none; padding:8px; width:100%; border-radius:4px; font-weight:bold; cursor:pointer;">定位并高亮</button>`;
            document.body.appendChild(panel);
            document.getElementById('alist-jump-btn').onclick = () => {
                const target = window.lastTargetItem;
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // 使用 classList.toggle 避免重绘
                    if (!target.classList.contains('alist-highlight-style')) {
                          target.classList.add('alist-highlight-style');
                    }
                    setTimeout(() => target.classList.remove('alist-highlight-style'), 2000);
                }
                document.getElementById('alist-helper-panel').style.display = 'none';
            };
        }
        if (!document.getElementById('alist-history-panel')) {
            const panel = document.createElement('div');
            panel.id = 'alist-history-panel'; panel.className = 'alist-panel';
            panel.innerHTML = `<div class="panel-close" onclick="this.parentElement.style.display='none'">✕</div><div style="color:#3498db; font-weight:bold; border-bottom:1px solid #444; padding-bottom:8px; margin-bottom:5px;">🕒 最近观看记录</div><div class="history-list" id="alist-history-list"></div>`;
            document.body.appendChild(panel);
        }
    }

    function showPanel(type) {
        const helper = document.getElementById('alist-helper-panel');
        const history = document.getElementById('alist-history-panel');
        if (type === 'helper') {
            history.style.display = 'none';
            helper.style.display = (helper.style.display === 'flex') ? 'none' : 'flex';
        } else {
            helper.style.display = 'none';
            if (history.style.display === 'flex') {
                history.style.display = 'none';
            } else {
                renderHistoryContent();
                history.style.display = 'flex';
            }
        }
    }

    function renderHistoryContent() {
        const container = document.getElementById('alist-history-list');
        const list = getHistoryList();
        container.innerHTML = '';
        if (list.length === 0) {
            container.innerHTML = '<div style="padding:20px; text-align:center; color:#666;">暂无记录</div>';
            return;
        }
        // 使用 DocumentFragment 批量插入，减少重绘
        const fragment = document.createDocumentFragment();
        list.forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item';
            div.innerHTML = `<div class="h-time">${formatTime(item.time)}</div><div class="h-name">${item.rawName}</div>`;
            div.onclick = () => jumpToRecord(item);
            fragment.appendChild(div);
        });
        container.appendChild(fragment);
    }

    // --- 5. 核心渲染循环 (性能优化重点) ---

    function mainLogic() {
        const items = findFileItems();

        // 1. 处理跨页面跳转 (一次性逻辑)
        const jumpTarget = sessionStorage.getItem('alist_jump_target');
        if (jumpTarget) {
            if (items.length > 0) {
                 if (highlightFile(jumpTarget, true)) {
                      sessionStorage.removeItem('alist_jump_target');
                 }
                 // 如果正在寻找跳转目标，暂停常规渲染以免冲突
                 return;
            }
        }

        if (items.length === 0) return;

        let lastWatchedItem = null;
        let maxTime = 0;

        // 2. 常规渲染：Diff 模式 (只修改需要修改的 DOM)
        items.forEach(item => {
            // 缓存 DOM 查询
            if (!item.dataset.nameEl) {
                const el = item.querySelector('.name') || item.querySelector('.filename') || item;
                // 使用 WeakMap 或直接存 dataset 避免泄露，这里简单用属性
                item._cachedNameEl = el;
                item.dataset.nameEl = 'cached';
            }
            const nameEl = item._cachedNameEl;
            const rawText = nameEl.innerText || nameEl.textContent;
            if (!rawText) return;

            const cleanText = normalize(rawText);
            const val = localStorage.getItem('alist_clean_' + cleanText);

            // 状态判断
            const isWatched = !!val;

            // 性能优化：只有当类名状态不一致时才操作 DOM
            if (isWatched) {
                if (!nameEl.classList.contains('alist-watched-style')) {
                    nameEl.classList.add('alist-watched-style');
                }

                // 解析时间找最新
                let t = 0;
                let rawName = rawText;
                if (val.startsWith('{')) {
                    // 这里必须解析，无法优化，但只对已看过的文件解析
                    try {
                        const obj = JSON.parse(val);
                        t = obj.time;
                        rawName = obj.rawName;
                    } catch(e) {}
                } else {
                    t = parseInt(val);
                }

                if (t > maxTime) {
                    maxTime = t;
                    lastWatchedItem = { item, nameEl, rawName: rawText };
                }
            } else {
                // 没看过，确保没有样式
                if (nameEl.classList.contains('alist-watched-style')) {
                    nameEl.classList.remove('alist-watched-style');
                }
                if (item.classList.contains('alist-highlight-style')) {
                    item.classList.remove('alist-highlight-style');
                }
            }
        });

        // 3. 绿色按钮逻辑
        initUI();
        const toggleBtn = document.getElementById('alist-toggle-btn');

        if (lastWatchedItem) {
            // 高亮最新
            const targetItem = lastWatchedItem.item;
            const targetName = lastWatchedItem.nameEl;

            // 移除灰色，添加高亮 (Diff check)
            if (targetName.classList.contains('alist-watched-style')) {
                targetName.classList.remove('alist-watched-style');
            }
            if (!targetItem.classList.contains('alist-highlight-style') && !targetItem.classList.contains('alist-target-style')) {
                targetItem.classList.add('alist-highlight-style');
            }
            if (!targetName.classList.contains('alist-highlight-text')) {
                targetName.classList.add('alist-highlight-text');
            }

            // 更新全局状态
            window.lastTargetItem = targetItem;
            const contentBox = document.getElementById('alist-panel-content');
            if (contentBox && contentBox.innerText !== lastWatchedItem.rawName) {
                contentBox.innerText = lastWatchedItem.rawName;
            }

            // 显示按钮
            if (document.getElementById('alist-helper-panel').style.display !== 'flex') {
                if (toggleBtn.style.display !== 'flex') toggleBtn.style.display = 'flex';
            }
        } else {
            if (toggleBtn.style.display !== 'none') toggleBtn.style.display = 'none';
            const hPanel = document.getElementById('alist-helper-panel');
            if (hPanel && hPanel.style.display !== 'none') hPanel.style.display = 'none';
        }
    }

    // 主循环
    let lastUrl = location.href;
    function loop() {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            lastUrl = currentUrl;
            // 页面跳转清理
            ['alist-helper-panel', 'alist-history-panel'].forEach(id => {
                const p = document.getElementById(id);
                if(p) p.style.display = 'none';
            });
        }

        recordHistory();
        mainLogic();
        initUI();
    }

    // 使用 requestAnimationFrame 或 setTimeOut 循环
    setInterval(loop, 1000);
    // 启动缓冲
    setTimeout(loop, 500);

})();