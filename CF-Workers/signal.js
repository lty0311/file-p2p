// Cloudflare Workers 信令服务器
// 使用 Durable Objects 实现跨实例状态共享

// Durable Object 类 - 管理单个传输房间
export class SignalRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    // 使用内存存储，因为 DO 实例内是单线程的
    this.clients = [];
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if(request.headers.get("Upgrade") !== "websocket"){
      return new Response("Need websocket", {status:426});
    }

    const [client, server] = new WebSocketPair();
    server.accept();

    // 限制房间人数
    if(this.clients.length >= 2) {
      server.send(JSON.stringify({type:"error", msg:"当前传输码已满，请更换"}));
      server.close();
      return new Response(null, {status:101, webSocket:client});
    }

    // 加入房间
    this.clients.push(server);
    const transferCode = url.searchParams.get("code");
    console.log(`[${transferCode}] 客户端加入，当前人数: ${this.clients.length}`);

    // 如果是第二个加入的，通知双方
    if(this.clients.length === 2) {
      console.log(`[${transferCode}] 双方已就绪，发送ready`);
      this.clients.forEach(ws => {
        if(ws.readyState === 1) {
          ws.send(JSON.stringify({type:"ready"}));
        }
      });
    }

    // 消息转发
    server.onmessage = (evt) => {
      this.clients.forEach(ws => {
        if(ws !== server && ws.readyState === 1) {
          ws.send(evt.data);
        }
      });
    };

    // 连接关闭
    server.onclose = () => {
      const idx = this.clients.indexOf(server);
      if(idx > -1) {
        this.clients.splice(idx, 1);
        console.log(`[${transferCode}] 客户端离开，当前人数: ${this.clients.length}`);
      }
      // 通知对方断开
      if(this.clients.length === 1) {
        this.clients[0].send(JSON.stringify({type:"peer_disconnect"}));
      }
    };

    return new Response(null, {status:101, webSocket:client});
  }
}

// 主 Worker
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    if(url.pathname === "/signal"){
      const transferCode = url.searchParams.get("code");
      if(!transferCode || transferCode.length === 0 || transferCode.length > 32 || !/^[a-zA-Z0-9]+$/.test(transferCode)){
        return new Response("Invalid transfer code", {status:400});
      }

      // 获取或创建 Durable Object 实例
      const id = env.SIGNAL_ROOM.idFromName(transferCode);
      const obj = env.SIGNAL_ROOM.get(id);
      
      // 将请求转发给 Durable Object
      return obj.fetch(request);
    }
    
    return new Response("Signal Server Ready (Durable Objects)", {status:200});
  }
}

// Durable Object 绑定声明
export const durableObjects = {
  SIGNAL_ROOM: SignalRoom
};