// Cloudflare Workers 信令服务器
// 使用 WebSocketPair 处理信令转发
// 注意：由于 Workers 隔离特性，需要使用 Durable Objects 才能正确配对
// 本版本使用简单的广播模式：同一传输码的消息会转发给所有其他连接

// 使用全局状态存储房间（在单 Worker 实例内有效）
const rooms = new Map();

export default {
  async fetch(request) {
    const url = new URL(request.url);
    
    if(url.pathname === "/signal"){
      if(request.headers.get("Upgrade") !== "websocket"){
        return new Response("Need websocket", {status:426});
      }
      
      const transferCode = url.searchParams.get("code");
      if(!transferCode || transferCode.length !== 6){
        return new Response("Invalid transfer code", {status:400});
      }
      
      const [client, server] = new WebSocketPair();
      server.accept();

      // 获取或创建房间
      if(!rooms.has(transferCode)) {
        rooms.set(transferCode, []);
      }
      const room = rooms.get(transferCode);
      
      // 限制房间人数
      if(room.length >= 2) {
        server.send(JSON.stringify({type:"error", msg:"当前传输码已满，请更换"}));
        server.close();
        return new Response(null, {status:101, webSocket:client});
      }
      
      // 加入房间
      room.push(server);
      console.log(`[${transferCode}] 客户端加入，当前人数: ${room.length}`);
      
      // 如果是第二个加入的，通知双方
      if(room.length === 2) {
        console.log(`[${transferCode}] 双方已就绪，发送ready`);
        room.forEach(ws => {
          if(ws.readyState === 1) {
            ws.send(JSON.stringify({type:"ready"}));
          }
        });
      }

      // 消息转发
      server.onmessage = (evt) => {
        room.forEach(ws => {
          if(ws !== server && ws.readyState === 1) {
            ws.send(evt.data);
          }
        });
      };

      // 连接关闭
      server.onclose = () => {
        const idx = room.indexOf(server);
        if(idx > -1) {
          room.splice(idx, 1);
          console.log(`[${transferCode}] 客户端离开，当前人数: ${room.length}`);
        }
        if(room.length === 0) {
          rooms.delete(transferCode);
        }
      };

      return new Response(null, {status:101, webSocket:client});
    }
    
    return new Response("Signal Server Ready", {status:200});
  }
}