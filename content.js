// 通用直播流提取函数
function extractLiveList() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('douyin.com')) {
    return extractDyLiveList();
  } else if (hostname.includes('bilibili.com')) {
    return extractBilibiliLiveList();
  }
  
  return [];
}


// Send extracted URLs to the popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  try {
    if (request.action === "extractLiveList") {
      // 通用直播流提取
      var liveList = extractLiveList();
      sendResponse(liveList);
      return true; // 表示会异步响应
    } else if (request.action === "extractDyLiveList") {
      // 兼容原有抖音直播流提取
      var dyList = extractDyLiveList();
      sendResponse(dyList);
      return true; // 表示会异步响应
    }
    // 如果没有匹配的action，返回默认响应
    sendResponse([]);
    return true;
  } catch (error) {
    console.error("处理消息失败:", error);
    sendResponse([]);
    return true;
  }
});