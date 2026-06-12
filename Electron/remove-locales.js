// scripts/remove-locales.js
const fs = require('fs');
const path = require('path');

// 需要保留的语言（英文和中英文）
const keepLocales = [
  'en-US.pak',   // 美式英文
  'en-GB.pak',   // 英式英文
  'zh-CN.pak',   // 简体中文
  'zh-TW.pak'    // 繁体中文
];

exports.default = async (context) => {
  const { electronPlatformName, appOutDir } = context;
  
  if (electronPlatformName !== 'win32') {
    return; // 只在 Windows 下处理
  }
  
  const localesPath = path.join(appOutDir, 'locales');
  
  if (!fs.existsSync(localesPath)) {
    console.log('locales 文件夹不存在，跳过');
    return;
  }
  
  const files = fs.readdirSync(localesPath);
  let removedCount = 0;
  
  for (const file of files) {
    if (file.endsWith('.pak') && !keepLocales.includes(file)) {
      const filePath = path.join(localesPath, file);
      fs.unlinkSync(filePath);
      removedCount++;
      console.log(`删除: ${file}`);
    }
  }
  
  console.log(`✅ 已删除 ${removedCount} 个语言包，保留: ${keepLocales.join(', ')}`);
};
