const {contextBridge, ipcRenderer} = require('electron');

contextBridge.exposeInMainWorld("electronAPI", {
  selectFile: ()=> ipcRenderer.invoke("select-file"),
  selectFiles: ()=> ipcRenderer.invoke("select-files"),
  readChunk: (path, offset, size)=> ipcRenderer.invoke("read-file-chunk", path, offset, size),
  selectSave: (defaultFileName)=> ipcRenderer.invoke("select-save-path", defaultFileName),
  writeChunk: (savePath, buf, offset)=> ipcRenderer.invoke("write-file-chunk", savePath, buf, offset),
  getFileInfo: (path)=> ipcRenderer.invoke("get-file-info", path)
})