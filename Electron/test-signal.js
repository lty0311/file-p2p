// 信令服务器测试脚本
// 运行方式: node test-signal.js
const WebSocket = require('ws');

const SIGNAL_URL = 'wss://p2pfile.cool-emoji.com/signal';
const TEST_CODE = '123456';

console.log('=== 测试信令服务器 ===');

// 模拟客户端A
const clientA = new WebSocket(`${SIGNAL_URL}?code=${TEST_CODE}`);
clientA.onopen = () => {
  console.log('客户端A 连接成功');
};

clientA.onmessage = (e) => {
  console.log('客户端A 收到:', e.data);
};

clientA.onerror = (err) => {
  console.error('客户端A 错误:', err);
};

// 延迟2秒后连接客户端B
setTimeout(() => {
  const clientB = new WebSocket(`${SIGNAL_URL}?code=${TEST_CODE}`);
  clientB.onopen = () => {
    console.log('客户端B 连接成功');
  };

  clientB.onmessage = (e) => {
    console.log('客户端B 收到:', e.data);
  };

  clientB.onerror = (err) => {
    console.error('客户端B 错误:', err);
  };
}, 2000);
