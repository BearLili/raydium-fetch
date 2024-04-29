const Koa = require('koa');
const bodyParser = require('koa-bodyparser');

const app = new Koa();
const PORT = process.env.PORT || 3000;

// 使用 bodyParser 中间件解析请求体
app.use(bodyParser());

// POST 请求处理程序，用于接收来自 Helius 的 webhook 数据
app.use(async (ctx) => {
  if (ctx.method === 'POST' && ctx.path === '/webhook') {
    // 获取来自 Helius 的 webhook 数据
    const webhookData = ctx.request.body;
    
    // 在此处处理 webhook 数据，你可以将它发送给你的 bot 或执行其他操作
    console.log('Received webhook data from Helius:', JSON.stringify(webhookData));
    
    // 响应 Helius，表示已成功接收到数据
    ctx.status = 200;
    ctx.body = 'Webhook received successfully';
  } else {
    // 如果收到的请求不是 POST 方法或路径不正确，则返回 404
    ctx.status = 404;
    ctx.body = 'Not found';
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
