const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const WebSocket = require('ws');

const app = new Koa();
const PORT = process.env.PORT || 3000;

// 使用 bodyParser 中间件解析请求体
app.use(bodyParser());

// 创建 HTTP 服务器
const server = app.listen(PORT, () => {
  console.log(`HTTP Server is running on port ${PORT}`);
});

// 创建 WebSocket 服务器
const wss = new WebSocket.Server({ server });

// WebSocket 连接建立时的处理逻辑
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  // 接收消息
  ws.on('message', (message) => {
    console.log('Received message from WebSocket client:', message);

    // 处理消息，并发送响应
    ws.send('Received your message: ' + message);
  });

  // 监听连接关闭事件
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// POST 请求处理程序，用于接收来自 Helius 的 webhook 数据
app.use(async (ctx) => {
  if (ctx.method === 'POST' && ctx.path === '/webhook') {
    // 记录接收到推送信息的时间
    const receivedTime = new Date().toISOString();
    
    // 获取来自 Helius 的 webhook 数据
    const webhookData = ctx.request.body;
    
    // 在此处处理 webhook 数据，你可以将它发送给你的 bot 或执行其他操作
    console.log('Received webhook data from Helius:', JSON.stringify(webhookData));
    console.log('Received time:', receivedTime); // 打印接收到推送信息的时间
    
    // 响应 Helius，表示已成功接收到数据
    ctx.status = 200;
    ctx.body = 'Webhook received successfully';
  } else {
    // 如果收到的请求不是 POST 方法或路径不正确，则返回 404
    ctx.status = 404;
    ctx.body = 'Not found';
  }
});

// 暴露 WebSocket 服务器和 HTTP 服务器
module.exports = { server, wss };
