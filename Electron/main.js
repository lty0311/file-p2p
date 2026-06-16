const {app, BrowserWindow, ipcMain, dialog, Menu, shell} = require('electron');
const path = require('path');
const fs = require('fs');
const { version } = require('./package.json');

app.disableHardwareAcceleration();
Menu.setApplicationMenu(null);
let mainWin;

function createWindow(){
  mainWin = new BrowserWindow({
    width: 980,
    height: 640,
    icon: path.join(__dirname, "logo/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  mainWin.loadFile("index.html");
  // 开发打开控制台
  mainWin.webContents.openDevTools();
//   if (process.env.NODE_ENV2 === 'development') {
//     mainWin.webContents.openDevTools();
//   }
}

app.whenReady().then(createWindow);

// 渲染层请求读取本地文件（单选）
ipcMain.handle("select-file", async ()=>{
  const res = await dialog.showOpenDialog({properties:["openFile"]});
  if(res.canceled) return null;
  return res.filePaths[0];
})

// 渲染层请求读取本地文件（多选）
ipcMain.handle("select-files", async ()=>{
  const res = await dialog.showOpenDialog({properties:["openFile", "multiSelections"]});
  if(res.canceled) return [];
  return res.filePaths;
})

// 读取文件流式buffer（分块读取，不占内存）
ipcMain.handle("read-file-chunk", async (_, filePath, offset, size)=>{
  const fd = fs.openSync(filePath, "r");
  const buf = Buffer.alloc(size);
  fs.readSync(fd, buf, 0, size, offset);
  fs.closeSync(fd);
  return buf.buffer;
})

// 接收端写入文件
ipcMain.handle("write-file-chunk", async (_, savePath, chunkBuf, offset)=>{
  try {
    console.log("[Main] 写入文件块: savePath=", savePath, "offset=", offset, "size=", chunkBuf.byteLength);
    // 确保目录存在
    const dir = path.dirname(savePath);
    console.log("[Main] 检查目录: ", dir);
    if(!fs.existsSync(dir)){
      console.log("[Main] 目录不存在，创建目录: ", dir);
      fs.mkdirSync(dir, {recursive: true});
    }
    const fd = fs.openSync(savePath, "a+");
    const written = fs.writeSync(fd, Buffer.from(chunkBuf), 0, chunkBuf.byteLength, offset);
    fs.closeSync(fd);
    console.log("[Main] 写入成功: written=", written);
    return true;
  } catch(err) {
    console.error("[Main] 写入文件块出错:", err);
    throw err;
  }
})

// 选择保存目录
ipcMain.handle("select-save-path", async (_, defaultFileName)=>{
  const options = {
    defaultPath: defaultFileName || undefined
  };
  const res = await dialog.showSaveDialog(options);
  if(res.canceled) return null;
  return res.filePath;
})

// 获取文件信息（名称和大小）
ipcMain.handle("get-file-info", async (_, filePath)=>{
  try {
    const stats = fs.statSync(filePath);
    return {
      name: path.basename(filePath),
      size: stats.size
    };
  } catch(e) {
    return null;
  }
})

// 获取版本号
ipcMain.handle("get-version", async ()=>{
  console.log("[Main] 获取版本号: ", version);
  return version;
})

// 在系统默认浏览器中打开 URL
ipcMain.handle("open-external-url", async (_, url)=>{
  try {
    await shell.openExternal(url);
    console.log('打开外部链接:', url);
    return true;
  } catch(err) {
    console.error('打开外部链接失败:', err);
    return false;
  }
})