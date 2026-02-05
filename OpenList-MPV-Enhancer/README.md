# 📺 OpenList to MPV 增强脚本

本脚本旨在为 AList (或 OpenList) 用户提供更强大的视频播放体验，通过一键调用本地 MPV 播放器，解决 Web 端播放器的兼容性与性能问题。

## ✨ 主要功能

- **一键解析播放**：将 `mpv://` 协议链接解码为直链，方便在本地播放器中直接播放。
- **剪贴板集成**：自动识别剪贴板中的 mpv 链接并提供一键解析。
- **原生体验**：保持 AList 的极简风格，无缝集成到现有 UI。

## 🚀 安装与使用

1. **安装脚本**：点击 [此处](https://github.com/Mulan-healer/My-Tampermonkey-Scripts/raw/main/OpenList-MPV-Enhancer/script.user.js) 安装。
2. **配合后端**：
   - 该脚本通常配合 `mpv-handler` 或类似的本地协议处理器使用。
   - 确保你的系统已注册 `mpv://` 协议。
3. **播放视频**：
   - 在 AList 页面中，点击视频链接（如果支持 mpv 协议）。
   - 或者点击页面左下角的“🔗 解析剪贴板 mpv 链接”按钮。

## ⚙️ 配置说明

目前脚本采用开箱即用的配置，无需额外设置。如有特殊需求，可编辑脚本源码中的 `preciseDecode` 函数。

## 📸 预览
*(此处可添加截图 screenshot.png)*

---

[返回主仓库](../README.md)
