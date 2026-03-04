# 🚀 油猴脚本 GitHub 管理与发布全流程指南

本指南详细介绍了如何从零开始建立一个 GitHub 脚本仓库，并实现“一键安装”及“自动更新”功能的完整流程。

---

## 📅 第一阶段：建立远程仓库 (GitHub 端)

1. **登录 GitHub**：访问 [github.com](https://github.com/)。
2. **新建仓库**：
   - 点击右上角 `+` -> `New repository`。
   - **Repository name**: 输入仓库名（例如：`My-Tampermonkey-Scripts`）。
   - **Public/Private**: 选择 `Public`（公开仓库才能实现外链安装）。
   - **Initialize this repository**: 勾选 `Add a README file`。
   - 点击 `Create repository`。

---

## 💻 第二阶段：建立本地仓库 (PC 端)

1. **克隆仓库到本地**：
   在本地目标文件夹中打开终端（PowerShell 或 Git Bash），运行：
   ```powershell
   git clone https://github.com/你的用户名/My-Tampermonkey-Scripts.git
   cd My-Tampermonkey-Scripts
   ```

2. **组织目录结构**：
   建议按照脚本功能划分文件夹，例如：
   ```text
   My-Tampermonkey-Scripts/
   ├── README.md
   ├── .gitignore
   ├── OpenList-MPV-Enhancer/
   │   └── script.user.js
   └── Other-Scripts/
       └── AList-Watching-Assistant.user.js
   ```

---

## 🔗 第三阶段：实现“一键安装”链接

油猴插件通过读取文件的 **Raw (原始数据)** 内容来触发安装。

1. **获取 Raw 链接规律**：
   - 标准格式：`https://github.com/用户名/仓库名/raw/分支名/脚本相对路径`
   - **示例**：`https://github.com/Mulan-healer/My-Tampermonkey-Scripts/raw/main/Other-Scripts/AList-Watching-Assistant.user.js`

2. **在 README.md 中编写安装表格**：
   ```markdown
   | 脚本名称 | 功能描述 | 安装链接 |
   | :--- | :--- | :--- |
   | **AList 观看助手** | 优化 AList 体验 | [点击安装](https://github.com/Mulan-healer/My-Tampermonkey-Scripts/raw/main/Other-Scripts/AList-Watching-Assistant.user.js) |
   ```

---

## 🔄 第四阶段：开发、推送与更新流程

每当你需要更新脚本或发布新脚本时，遵循以下步骤：

### 1. 修改本地代码
在编辑器中打开 `.user.js` 文件。
**注意**：如果要触发用户端的自动更新，必须修改脚本头部的 `@version`：
```javascript
// ==UserScript==
// @name         AList 观看助手
// @version      12.2  <-- 增加版本号
// ...
```

### 2. 提交更改
在终端中依次运行：
```powershell
# 1. 将更改添加到暂存区
git add .

# 2. 提交到本地仓库 (引号内填写本次修改的内容)
git commit -m "Update AList Assistant to V12.2: Fixed UI bugs"

# 3. 推送到 GitHub 云端
git push origin main
```

---

## 🛠️ 第五阶段：用户如何获取更新？

- **首次安装**：用户点击你 README 中的链接，油猴插件会弹出安装界面。
- **自动更新**：
  - 油猴插件会定期检查 `@version` 标签。
  - 如果 GitHub 上的版本号高于本地安装的版本号，插件会自动下载并静默更新（或根据用户设置提示更新）。

---

## 💡 进阶小技巧：.gitignore
为了避免将不必要的文件（如 IDE 配置）推送到 GitHub，建议在根目录创建 `.gitignore` 文件并写入：
```text
.vscode/
.idea/
*.log
node_modules/
```

---
*文档生成日期：2026-03-04*
