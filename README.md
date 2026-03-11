# ✨ WorkFlow — 个人工作流管理系统

一款轻量级、美观的个人工作流管理工具，基于原生 HTML/CSS/JS + Node.js 构建，无需数据库，开箱即用。

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🚀 功能特性

### 📋 任务管理
- 创建、编辑、删除任务，支持优先级（紧急/高/中/低）
- 任务状态流转：待处理 → 进行中 → 已完成
- 标签分类、时间区间设置
- 多维度筛选与搜索（状态、优先级、关键词）
- 拖拽排序，支持批量操作

### 📅 日历视图
- 月历视图直观展示任务分布
- 快速查看每日任务概况
- 支持月份切换与今日定位

### 📝 复盘管理
- 记录工作复盘与总结
- 支持评分、分类和标签
- 时间线展示历史复盘

### 📊 数据统计
- 任务完成率、优先级分布等可视化图表
- 周/月维度数据分析
- 工作效率趋势追踪

### 🗒️ 我的笔记
- 快速记录工作笔记与灵感
- 分类管理（工作/学习/想法/其他）
- 全文搜索与排序

### 🛠️ 实用工具
- **翻译工具** — 集成多平台翻译
- **JSON 格式化** — 一键美化/压缩 JSON
- **正则测试** — 实时匹配与高亮

## 📦 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18

### 安装与运行

```bash
# 克隆项目
git clone git@github.com:liwai1206haha/WORKFLOW.git
cd WORKFLOW

# 启动服务
node server.js
```

启动后访问：**http://localhost:8090**

### 停止服务

```bash
# macOS / Linux
lsof -ti :8090 | xargs kill -9

# 或直接在终端按 Ctrl + C
```

## 📁 项目结构

```
WORKFLOW/
├── index.html          # 主页面
├── style.css           # 样式文件
├── app.js              # 前端逻辑
├── server.js           # Node.js 后端服务
├── data.json.example   # 数据文件示例（空模板）
├── data.json           # 数据文件（自动生成，已 gitignore）
└── README.md           # 项目说明
```

## 💾 数据存储

- 数据持久化到项目目录下的 `data.json` 文件（首次运行自动生成）
- 浏览器 `localStorage` 作为实时备份
- 支持数据导入/导出（JSON 格式）

> 💡 `data.json` 已加入 `.gitignore`，你的个人数据不会被提交到仓库。可参考 `data.json.example` 了解数据结构。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

[MIT](LICENSE)
