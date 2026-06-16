// 通知脚本生成器
// 根据客户端版本号动态生成脚本

const UPDATE_CONFIG = {
  latestVersion: '1.1.0',
  downloadUrl: 'https://github.com/lty0311/file-p2p/releases'
};

export function generateNoticeScript(clientVersion) {
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  const isOutdated = compareVersions(clientVersion, UPDATE_CONFIG.latestVersion) < 0;

  let script = '(function() {\n';
  script += '  console.log("%c🦊 闪联灵狐", "font-size: 20px; color: #FF6B6B; font-weight: bold;");\n';
  script += '  console.log("%c当前版本: ' + clientVersion + '", "color: #009688;");\n';
  script += '\n';

  if (isOutdated) {
    script += '  showUpdateBanner();\n';
  }

  script += '\n';
  script += '  // 使用全局定义的 openExternalUrl 函数（由客户端定义）\n';
  script += '  function openExternalUrl(url) {\n';
  script += '    if (typeof window.openExternalUrl === "function") {\n';
  script += '      window.openExternalUrl(url);\n';
  script += '    } else {\n';
  script += '      window.open(url, "_blank");\n';
  script += '    }\n';
  script += '  }\n';
  script += '\n';
  script += '  function showUpdateBanner() {\n';
  script += '    const banner = document.createElement("div");\n';
  script += '    banner.id = "update-banner";\n';
  script += '    banner.style.cssText = "position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(90deg, #ff6b6b 0%, #ee5a6f 100%); color: white; padding: 12px 20px; text-align: center; font-size: 14px; font-weight: 500; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.15); display: flex; align-items: center; justify-content: center; gap: 12px;";\n';
  script += '    banner.innerHTML = "📢 有新版本，建议升级 <a href=\\"#\\" id=\\"update-download-link\\" style=\\"color: white; text-decoration: underline; font-weight: 600;\\">立即下载</a> <span id=\\"update-close-btn\\" style=\\"cursor: pointer; margin-left: 8px; opacity: 0.8;\\">✕</span>";\n';
  script += '\n';
  script += '    const closeBtn = banner.querySelector("#update-close-btn");\n';
  script += '    closeBtn.onclick = function() {\n';
  script += '      banner.remove();\n';
  script += '    };\n';
  script += '\n';
  script += '    const downloadLink = banner.querySelector("#update-download-link");\n';
  script += '    downloadLink.onclick = function(e) {\n';
  script += '      e.preventDefault();\n';
  script += '      openExternalUrl("' + UPDATE_CONFIG.downloadUrl + '");\n';
  script += '    };\n';
  script += '\n';
  script += '    document.body.insertBefore(banner, document.body.firstChild);\n';
  script += '  }\n';
  script += '\n';
  script += '  function showForceModalNoClose(title, content) {\n';
  script += '    const modal = document.createElement("div");\n';
  script += '    modal.id = "force-update-modal";\n';
  script += '    modal.style.cssText = "position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.9); z-index: 999999; display: flex; align-items: center; justify-content: center; padding: 20px;";\n';
  script += '\n';
  script += '    const modalContent = document.createElement("div");\n';
  script += '    modalContent.style.cssText = "background: white; border-radius: 12px; max-width: 500px; width: 100%; padding: 32px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);";\n';
  script += '\n';
  script += '    const icon = document.createElement("div");\n';
  script += '    icon.style.cssText = "font-size: 64px; margin-bottom: 16px;";\n';
  script += '    icon.textContent = "⚠️";\n';
  script += '\n';
  script += '    const modalTitle = document.createElement("h2");\n';
  script += '    modalTitle.style.cssText = "margin: 0 0 16px 0; color: #1f2937; font-size: 24px;";\n';
  script += '    modalTitle.textContent = title || "重要通知";\n';
  script += '\n';
  script += '    const modalBody = document.createElement("div");\n';
  script += '    modalBody.style.cssText = "color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px; white-space: pre-wrap;";\n';
  script += '    modalBody.textContent = content || "";\n';
  script += '\n';
  script += '\n';
  script += '    modalContent.appendChild(icon);\n';
  script += '    modalContent.appendChild(modalTitle);\n';
  script += '    modalContent.appendChild(modalBody);\n';
  script += '    modalContent.appendChild(button);\n';
  script += '    modal.appendChild(modalContent);\n';
  script += '    document.body.appendChild(modal);\n';
  script += '\n';
  script += '    // 禁止关闭\n';
  script += '    modal.onclick = function(e) {\n';
  script += '      e.stopPropagation();\n';
  script += '    };\n';
  script += '\n';
  script += '    document.addEventListener("keydown", function preventClose(e) {\n';
  script += '    if (e.key === "Escape") {\n';
  script += '      e.preventDefault();\n';
  script += '    }\n';
  script += '  });\n';
  script += '  }\n';
  script += '\n';
  script += '  window.NoticeAPI = {\n';
  script += '    showUpdateBanner: showUpdateBanner,\n';
  script += '    showForceModalNoClose: showForceModalNoClose\n';
  script += '  };\n';
  script += '})();';

  return script;
}

export default UPDATE_CONFIG;