// 本地信令服务器（用于测试，无隔离问题）
// 运行方式: node local-signal-server.js
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
const rooms = new Map();

console.log('本地信令服务器启动 :8080');
console.log('客户端连接示例: ws://localhost:8080?code=123456');

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, 'http://localhost');
  const code = url.searchParams.get('code') || '000000';
  
  console.log(`[${code}] 新连接`);

  if (!rooms.has(code)) rooms.set(code, []);
  const room = rooms.get(code);

  // 限制人数
  if (room.length >= 2) {
    ws.send(JSON.stringify({ type: 'error', msg: '房间已满' }));
    ws.close();
    return;
  }

  // 加入房间
  room.push(ws);
  console.log(`[${code}] 当前人数: ${room.length}`);

  // 第二个加入时通知双方
  if (room.length === 2) {
    console.log(`[${code}] 双方就绪，发送ready`);
    room.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'ready' }));
      }
    });
  }

  // 消息转发
  ws.on('message', (data) => {
    // 确保数据是字符串（ws模块默认接收Buffer）
    const message = typeof data === 'string' ? data : data.toString();
    console.log(`[${code}] 收到消息: ${message.substring(0, 100)}...`);
    console.log(`[${code}] 房间人数: ${room.length}，准备转发给 ${room.length - 1} 个客户端`);
    let forwarded = 0;
    room.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        console.log(`[${code}] 转发给客户端...`);
        client.send(message);
        forwarded++;
      }
    });
    console.log(`[${code}] 实际转发给 ${forwarded} 个客户端`);
  });

  // 连接关闭
  ws.on('close', () => {
    const idx = room.indexOf(ws);
    if (idx > -1) room.splice(idx, 1);
    console.log(`[${code}] 断开连接，剩余 ${room.length} 人`);
    if (room.length === 0) rooms.delete(code);
  });
});
