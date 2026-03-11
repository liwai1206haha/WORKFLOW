const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = 8090;
const DATA_FILE = path.join(__dirname, 'data.json');

// MIME 类型映射
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

// 初始化数据文件
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ tasks: [], reviews: [], notes: [] }, null, 2));
}

const server = http.createServer((req, res) => {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API: 读取数据
  if (req.method === 'GET' && req.url === '/api/data') {
    try {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(data);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: '读取数据失败' }));
    }
    return;
  }

  // API: 保存数据
  if (req.method === 'POST' && req.url === '/api/data') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '数据格式错误' }));
      }
    });
    return;
  }

  // API: 翻译
  if (req.method === 'POST' && req.url === '/api/translate') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { text, from, to } = JSON.parse(body);
        if (!text || !to) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '缺少必要参数' }));
          return;
        }

        const sl = from === 'auto' ? 'auto' : from;
        const tl = to;
        const encoded = encodeURIComponent(text);
        const apiUrl = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${tl}&dt=t&q=${encoded}`;

        const parsedUrl = new URL(apiUrl);
        const options = {
          hostname: parsedUrl.hostname,
          path: parsedUrl.pathname + parsedUrl.search,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0',
          },
        };

        const apiReq = https.request(options, (apiRes) => {
          let data = '';
          apiRes.on('data', chunk => { data += chunk; });
          apiRes.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              let result = '';
              if (parsed[0]) {
                result = parsed[0].map(s => s[0]).filter(Boolean).join('');
              }
              const detectedLang = parsed[2] || sl;
              res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ result, detectedLang }));
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
              res.end(JSON.stringify({ error: '解析翻译结果失败' }));
            }
          });
        });

        apiReq.on('error', (e) => {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: '翻译服务连接失败: ' + e.message }));
        });

        apiReq.end();
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: '请求格式错误' }));
      }
    });
    return;
  }

  // 静态文件服务
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(__dirname, filePath.split('?')[0]);

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`WorkFlow 服务已启动: http://localhost:${PORT}`);
  console.log(`数据文件: ${DATA_FILE}`);
});
