// Cloudflare Workers 信令服务器
// 使用 Durable Objects 实现跨实例状态共享

// HTML 主页内容
const INDEX_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>P2P 文件传输</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;background:#f5f5f5;height:100vh;display:flex;flex-direction:column;}
    
    .connection-bar{background:#2563eb;color:white;padding:12px 16px;display:flex;align-items:center;gap:8px;position:sticky;top:0;z-index:100;}
    .connection-bar input{flex:1;padding:10px 14px;border:none;border-radius:8px;font-size:16px;}
    .connection-bar .btn{padding:10px 16px;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;}
    .btn-primary{background:#1d4ed8;color:white;}
    .btn-outline{background:rgba(255,255,255,0.2);color:white;border:1px solid rgba(255,255,255,0.3);}
    .status-badge{display:flex;align-items:center;gap:6px;font-size:12px;padding:4px 8px;border-radius:12px;}
    .status-disconnected{background:#dc2626;}
    .status-connecting{background:#d97706;}
    .status-connected{background:#16a34a;}
    .status-dot{width:8px;height:8px;border-radius:50%;background:white;}
    .status-connecting .status-dot{animation:pulse 1s infinite;}
    @keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    
    .main-content{flex:1;display:flex;flex-direction:column;padding:12px;gap:12px;overflow:auto;}
    
    .card{background:white;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;}
    .card-header{padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;justify-content:space-between;}
    .card-title{font-size:16px;font-weight:600;color:#1f2937;}
    .card-body{padding:12px;}
    
    .file-list{display:flex;flex-direction:column;gap:8px;}
    .file-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:8px;background:#f9fafb;}
    .file-icon{width:40px;height:40px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:20px;background:#e5e7eb;}
    .file-info{flex:1;min-width:0;}
    .file-name{font-size:14px;font-weight:500;color:#1f2937;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
    .file-size{font-size:12px;color:#6b7280;}
    .file-status{font-size:12px;padding:2px 6px;border-radius:4px;margin-left:auto;}
    .status-pending{background:#fef3c7;color:#d97706;}
    .status-sending{background:#dbeafe;color:#2563eb;}
    .status-receiving{background:#d1fae5;color:#059669;}
    .status-done{background:#f0fdf4;color:#166534;}
    .status-rejected{background:#fee2e2;color:#dc2626;}
    .file-actions{display:flex;gap:6px;}
    
    .btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer;transition:background 0.2s;}
    .btn-success{background:#10b981;color:white;}
    .btn-danger{background:#ef4444;color:white;}
    .btn-small{padding:6px 12px;font-size:12px;}
    
    .empty-state{text-align:center;padding:30px 20px;color:#9ca3af;}
    .empty-state-icon{font-size:48px;margin-bottom:12px;}
    .empty-state-text{font-size:14px;}
    
    .add-file-area{border-radius:12px;padding:24px;text-align:center;cursor:pointer;color:#6b7280;transition:border-color 0.2s;}
    .add-file-area:hover, .add-file-area:active{border-color:#2563eb;color:#2563eb;}
    .add-file-icon{font-size:36px;margin-bottom:10px;}
    .add-file-text{font-size:14px;font-weight:500;}
    
    .progress-bar{height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden;margin:12px 0;}
    .progress-fill{height:100%;background:#2563eb;border-radius:4px;transition:width 0.3s;}
    .progress-info{display:flex;justify-content:space-between;font-size:12px;color:#6b7280;margin-bottom:8px;}
    
    .status-bar{background:white;padding:10px 16px;border-top:1px solid #f0f0f0;font-size:13px;color:#6b7280;text-align:center;}
    
    .action-buttons{display:flex;gap:8px;margin-top:12px;}
    .action-buttons .btn{flex:1;}
    
    #fileInput{display:none;}
    
    @media(max-width:480px){
      .connection-bar{flex-wrap:wrap;}
      .connection-bar input{width:100%;order:1;}
      .connection-bar .btn{order:2;}
      .connection-bar .status-badge{order:3;width:100%;justify-content:center;margin-top:8px;}
    }
  </style>
</head>
<body>
  <div class="connection-bar">
    <input type="text" id="codeInput" placeholder="输入传输码" maxlength="32">
    <button id="genCode" class="btn btn-outline">生成</button>
    <button id="connectBtn" class="btn btn-primary">连接</button>
    <div id="connectionStatus" class="status-badge status-disconnected">
      <span class="status-dot"></span>
      <span>未连接</span>
    </div>
  </div>
  
  <div class="main-content">
    <div class="card">
      <div class="card-header">
        <span class="card-title">📤 发送文件</span>
        <button id="sendAllBtn" class="btn btn-success btn-small" style="display:none;">发送全部</button>
      </div>
      <div class="card-body">
        <label class="add-file-area" for="fileInput">
          <div class="add-file-icon">📁</div>
          <div class="add-file-text">点击添加文件</div>
        </label>
        <input type="file" id="fileInput" multiple>
        <div id="sendList" class="file-list"></div>
      </div>
    </div>
    
    <div class="card">
      <div class="card-header">
        <span class="card-title">📥 接收文件</span>
      </div>
      <div class="card-body">
        <div id="receiveList" class="file-list"></div>
      </div>
    </div>
    
    <div id="progressContainer" style="display:none;">
      <div class="progress-info">
        <span id="progressText">0%</span>
        <span id="progressSize">0B/0B</span>
      </div>
      <div class="progress-bar">
        <div id="progressBar" class="progress-fill"></div>
      </div>
    </div>
  </div>
  
  <div class="status-bar" id="statusBar">准备就绪</div>

  <script>
    const SIGNAL_SERVER = 'wss://p2pfile.cool-emoji.com/signal';
    const CHUNK_SIZE = 256 * 1024;
    
    let ws = null;
    let pc = null;
    let dc = null;
    let isReady = false;
    let isSending = false;
    let currentFileId = null;
    
    let sendFiles = [];
    let receiveFiles = [];
    
    const codeInput = document.getElementById('codeInput');
    const connectBtn = document.getElementById('connectBtn');
    const genCodeBtn = document.getElementById('genCode');
    const connectionStatus = document.getElementById('connectionStatus');
    const sendList = document.getElementById('sendList');
    const receiveList = document.getElementById('receiveList');
    const sendAllBtn = document.getElementById('sendAllBtn');
    const fileInput = document.getElementById('fileInput');
    const statusBar = document.getElementById('statusBar');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const progressSize = document.getElementById('progressSize');
    
    function setConnectionStatus(status, text){
      connectionStatus.className = 'status-badge status-' + status;
      connectionStatus.querySelector('span:last-child').textContent = text;
    }
    
    function setStatus(text){
      statusBar.textContent = text;
    }
    
    genCodeBtn.onclick = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let code = '';
      for(let i=0;i<32;i++){
        code += chars[Math.floor(Math.random() * chars.length)];
      }
      codeInput.value = code;
    };
    
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        sendFiles.push({
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          file: file,
          status: 'pending',
          sentBytes: 0
        });
      });
      renderSendList();
    };
    
    function renderSendList(){
      if(sendFiles.length === 0){
        sendList.innerHTML = '';
        sendAllBtn.style.display = 'none';
        return;
      }
      
      sendList.innerHTML = sendFiles.map(f => '<div class="file-item"><div class="file-icon">' + getFileIcon(f.name) + '</div><div class="file-info"><div class="file-name">' + f.name + '</div><div class="file-size">' + formatSize(f.size) + '</div></div><span class="file-status status-' + f.status + '">' + (f.status === 'pending' ? '待发送' : f.status === 'sending' ? '发送中' : f.status === 'done' ? '已完成' : '已拒绝') + '</span>' + (f.status === 'pending' ? '<button class="btn btn-danger btn-small" onclick="removeFile(' + f.id + ')">删除</button>' : '') + '</div>').join('');
      
      const hasPending = sendFiles.some(f => f.status === 'pending');
      sendAllBtn.style.display = hasPending ? 'block' : 'none';
    }
    
    function renderReceiveList(){
      if(receiveFiles.length === 0){
        receiveList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">暂无收到的文件</div></div>';
        return;
      }
      
      receiveList.innerHTML = receiveFiles.map(f => '<div class="file-item"><div class="file-icon">' + getFileIcon(f.name) + '</div><div class="file-info"><div class="file-name">' + f.name + '</div><div class="file-size">' + formatSize(f.size) + '</div></div><span class="file-status status-' + f.status + '">' + (f.status === 'pending' ? '待确认' : f.status === 'receiving' ? '接收中' : f.status === 'done' ? '已完成' : '已拒绝') + '</span>' + (f.status === 'pending' ? '<div class="file-actions"><button class="btn btn-success btn-small" onclick="acceptFile(' + f.id + ')">接收</button><button class="btn btn-danger btn-small" onclick="rejectFile(' + f.id + ')">拒绝</button></div>' : '') + '</div>').join('');
    }
    
    function getFileIcon(name){
      const ext = name.split('.').pop().toLowerCase();
      const icons = {'jpg':'🖼️','jpeg':'🖼️','png':'🖼️','gif':'🖼️','webp':'🖼️','svg':'📐','mp4':'🎬','mov':'🎬','avi':'🎬','mkv':'🎬','webm':'🎬','mp3':'🎵','wav':'🎵','ogg':'🎵','flac':'🎵','pdf':'📕','doc':'📘','docx':'📘','xls':'📗','xlsx':'📗','zip':'📦','rar':'📦','7z':'📦','tar':'📦','txt':'📄','json':'📄','xml':'📄'};
      return icons[ext] || '📄';
    }
    
    function formatSize(bytes){
      if(bytes < 1024) return bytes + 'B';
      if(bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + 'KB';
      return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
    }
    
    function removeFile(id){
      sendFiles = sendFiles.filter(f => f.id !== id);
      renderSendList();
    }
    
    function acceptFile(id){
      const file = receiveFiles.find(f => f.id === id);
      if(file){
        file.status = 'receiving';
        file.receivedBytes = 0;
        file.chunks = [];
        currentFileId = id;
        renderReceiveList();
        dc.send(JSON.stringify({type:'file_select', fileId:id, accept:true}));
        showProgress(true);
        setStatus('开始接收: ' + file.name);
      }
    }
    
    function rejectFile(id){
      const file = receiveFiles.find(f => f.id === id);
      if(file){
        file.status = 'rejected';
        renderReceiveList();
        dc.send(JSON.stringify({type:'file_select', fileId:id, accept:false}));
        setStatus('已拒绝: ' + file.name);
      }
    }
    
    function showProgress(show){
      progressContainer.style.display = show ? 'block' : 'none';
    }
    
    function updateProgress(current, total){
      const percent = (current / total * 100).toFixed(1);
      progressBar.style.width = percent + '%';
      progressText.textContent = percent + '%';
      progressSize.textContent = formatSize(current) + '/' + formatSize(total);
    }
    
    connectBtn.onclick = async () => {
      const code = codeInput.value.trim();
      if(!code || code.length > 32 || !/^[a-zA-Z0-9]+$/.test(code)){
        setStatus('请输入有效传输码（1-32位字母数字）');
        return;
      }
      
      connectBtn.disabled = true;
      setConnectionStatus('connecting', '连接中...');
      setStatus('正在连接信令服务器...');
      
      try {
        await connectToSignalServer(code);
      } catch(err) {
        console.error('连接失败:', err);
        setStatus('连接失败: ' + err.message);
        setConnectionStatus('disconnected', '未连接');
        connectBtn.disabled = false;
      }
    };
    
    async function connectToSignalServer(code){
      return new Promise((resolve, reject) => {
        ws = new WebSocket(SIGNAL_SERVER + '?code=' + code);
        
        ws.onopen = () => {
          console.log('[DEBUG] WebSocket连接已打开');
          setConnectionStatus('connecting', '信令已连接');
          setStatus('信令连接成功，等待对方接入');
        };
        
        ws.onmessage = (e) => {
          const msg = JSON.parse(e.data);
          console.log('[DEBUG] 收到消息:', msg.type);
          
          if(msg.type === 'ready'){
            isReady = true;
            setConnectionStatus('connected', '已连接(P2P)');
            setStatus('双方已就绪，开始建立P2P连接...');
            initPeerConnection();
            resolve();
          } else if(msg.type === 'offer'){
            handleOffer(msg.data);
          } else if(msg.type === 'answer'){
            handleAnswer(msg.data);
          } else if(msg.type === 'ice_candidate'){
            if(pc && msg.data){
              pc.addIceCandidate(new RTCIceCandidate(msg.data));
            }
          } else if(msg.type === 'peer_disconnect'){
            setStatus('对方已断开连接');
            resetConnection();
          }
        };
        
        ws.onerror = (err) => {
          reject(err);
        };
        
        ws.onclose = () => {
          if(dc && dc.readyState === 'open'){
            setConnectionStatus('connected', '已连接(P2P)');
          } else {
            setConnectionStatus('disconnected', '未连接');
            connectBtn.disabled = false;
          }
        };
      });
    }
    
    function initPeerConnection(){
      const config = {
        iceServers: [
          {urls: 'stun:stun.l.google.com:19302'},
          {urls: 'stun:stun1.l.google.com:19302'}
        ]
      };
      
      pc = new RTCPeerConnection(config);
      
      pc.onicecandidate = (e) => {
        if(e.candidate && ws && ws.readyState === WebSocket.OPEN){
          ws.send(JSON.stringify({type:'ice_candidate', data:e.candidate}));
        }
      };
      
      pc.ondatachannel = (e) => {
        dc = e.channel;
        bindDataChannel();
      };
      
      dc = pc.createDataChannel('file');
      bindDataChannel();
      
      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
      }).then(() => {
        if(ws && ws.readyState === WebSocket.OPEN){
          ws.send(JSON.stringify({type:'offer', data:pc.localDescription}));
          console.log('[DEBUG] 发送offer');
        }
      });
    }
    
    async function handleOffer(offer){
      if(!pc){
        const config = {
          iceServers: [
            {urls: 'stun:stun.l.google.com:19302'},
            {urls: 'stun:stun1.l.google.com:19302'}
          ]
        };
        pc = new RTCPeerConnection(config);
        
        pc.onicecandidate = (e) => {
          if(e.candidate && ws && ws.readyState === WebSocket.OPEN){
            ws.send(JSON.stringify({type:'ice_candidate', data:e.candidate}));
          }
        };
        
        pc.ondatachannel = (e) => {
          dc = e.channel;
          bindDataChannel();
        };
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      if(ws && ws.readyState === WebSocket.OPEN){
        ws.send(JSON.stringify({type:'answer', data:pc.localDescription}));
        console.log('[DEBUG] 发送answer');
      }
    }
    
    function handleAnswer(answer){
      if(pc){
        pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    }
    
    function bindDataChannel(){
      dc.binaryType = 'arraybuffer';
      
      dc.onopen = () => {
        setStatus('P2P连接已建立');
        const pendingFiles = sendFiles.filter(f => f.status === 'pending');
        if(pendingFiles.length > 0){
          sendFileList(pendingFiles);
        }
      };
      
      dc.onclose = () => {
        isSending = false;
        setStatus('连接已关闭');
      };
      
      dc.onmessage = async (e) => {
        if(typeof e.data === 'string'){
          const msg = JSON.parse(e.data);
          
          if(msg.type === 'file_list'){
            const newFiles = msg.files.filter(f => !receiveFiles.some(r => r.id === f.id));
            newFiles.forEach(f => receiveFiles.push({...f, status:'pending', receivedBytes:0}));
            renderReceiveList();
            setStatus('收到 ' + newFiles.length + ' 个文件');
          } else if(msg.type === 'file_select'){
            const file = sendFiles.find(f => f.id === msg.fileId);
            if(file){
              if(msg.accept){
                file.status = 'sending';
                currentFileId = msg.fileId;
                renderSendList();
                showProgress(true);
                setStatus('开始发送: ' + file.name);
                sendNextChunk(msg.fileId);
              } else {
                file.status = 'rejected';
                renderSendList();
                setStatus('对方拒绝: ' + file.name);
              }
            }
          } else if(msg.type === 'ack'){
            sendNextChunk(msg.fileId);
          } else if(msg.type === 'file_done'){
            const file = sendFiles.find(f => f.id === msg.fileId);
            if(file){
              file.status = 'done';
              file.sentBytes = file.size;
              currentFileId = null;
              renderSendList();
              showProgress(false);
              setStatus('发送完成: ' + file.name);
            }
          }
        } else {
          const file = receiveFiles.find(f => f.id === currentFileId);
          if(file && file.status === 'receiving'){
            if(!file.chunks) file.chunks = [];
            file.chunks.push(e.data);
            file.receivedBytes += e.data.byteLength;
            updateProgress(file.receivedBytes, file.size);
            
            if(file.receivedBytes >= file.size){
              file.status = 'done';
              currentFileId = null;
              renderReceiveList();
              showProgress(false);
              setStatus('接收完成: ' + file.name);
              dc.send(JSON.stringify({type:'file_done', fileId:file.id}));
              downloadFile(file);
            } else {
              dc.send(JSON.stringify({type:'ack', fileId:file.id}));
            }
          }
        }
      };
    }
    
    function sendFileList(files){
      dc.send(JSON.stringify({type:'file_list', files:files.map(f => ({id:f.id, name:f.name, size:f.size}))}));
      setStatus('正在传输 ' + files.length + ' 个文件...');
    }
    
    async function sendNextChunk(fileId){
      const file = sendFiles.find(f => f.id === fileId);
      if(!file || file.status !== 'sending') return;
      
      if(file.sentBytes >= file.size){
        file.status = 'done';
        renderSendList();
        showProgress(false);
        setStatus('发送完成: ' + file.name);
        return;
      }
      
      const chunkSize = Math.min(CHUNK_SIZE, file.size - file.sentBytes);
      const reader = new FileReader();
      
      return new Promise((resolve) => {
        reader.onload = (e) => {
          dc.send(e.target.result);
          file.sentBytes += chunkSize;
          updateProgress(file.sentBytes, file.size);
          resolve();
        };
        
        const blob = file.file.slice(file.sentBytes, file.sentBytes + chunkSize);
        reader.readAsArrayBuffer(blob);
      });
    }
    
    function downloadFile(file){
      const blob = new Blob(file.chunks);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    
    sendAllBtn.onclick = async () => {
      if(!ws || ws.readyState !== WebSocket.OPEN){
        const code = codeInput.value.trim();
        if(!code || code.length > 32 || !/^[a-zA-Z0-9]+$/.test(code)){
          setStatus('请先输入传输码并连接');
          return;
        }
        setConnectionStatus('connecting', '连接中...');
        await connectToSignalServer(code);
      }
      
      if(!dc || dc.readyState !== 'open'){
        setStatus('正在建立P2P连接...');
        return;
      }
      
      const pendingFiles = sendFiles.filter(f => f.status === 'pending');
      if(pendingFiles.length === 0){
        setStatus('没有待发送的文件');
        return;
      }
      
      sendFileList(pendingFiles);
    };
    
    function resetConnection(){
      if(dc) dc.close();
      if(pc) pc.close();
      if(ws) ws.close();
      dc = null;
      pc = null;
      ws = null;
      isReady = false;
      isSending = false;
      currentFileId = null;
      connectBtn.disabled = false;
      setConnectionStatus('disconnected', '未连接');
      setStatus('已重置');
    }
  </script>
</body>
</html>`;

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
    
    // 根路径返回 HTML 主页
    if(url.pathname === "/" || url.pathname === "/index.html"){
      return new Response(INDEX_HTML, {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "no-cache"
        }
      });
    }
    
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