const express = require('express');
const app = express();

app.use(express.json());

app.post('/test-callback', (req, res) => {
  console.log('收到请求:', req.body);
  res.json({ success: true, message: '测试成功' });
});

app.listen(3001, () => {
  console.log('测试服务器启动在端口 3001');
});
