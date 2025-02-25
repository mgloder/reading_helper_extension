// Add initialization flag
window.isContentScriptReady = true;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('Content script received message:', request);
  
  if (request.action === "getPageContent") {
    const pageContent = document.body.innerText;
    sendResponse({pageContent: pageContent});
  } else if (request.action === "ping") {
    // Add ping handler to check if content script is ready
    sendResponse({status: "ready"});
  }
  return true; // Keep the message channel open for async response
}); 

// Log when content script loads
console.log('Content script loaded and initialized'); 