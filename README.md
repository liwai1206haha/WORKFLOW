# WorkFlow - 日常工作记录

## 运行命令

### 启动项目

```bash
cd /Users/waylenli/CodeBuddy/WorkFlow && node server.js
```

访问地址：http://localhost:8090

### 停止运行

```bash
lsof -ti :8090 | xargs kill -9
```

### 重新运行

```bash
lsof -ti :8090 | xargs kill -9 2>/dev/null; sleep 1; cd /Users/waylenli/CodeBuddy/WorkFlow && node server.js
```

## 数据存储

- 数据持久化到项目目录下的 `data.json` 文件
- 浏览器 `localStorage` 作为备份存储
