document.addEventListener('DOMContentLoaded', function() {
  const chatHistory = document.getElementById('chat-history');
  const userInput = document.getElementById('user-input');
  const sendButton = document.getElementById('send-button');
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model');
  const saveConfigButton = document.getElementById('save-config');

  // Load global configuration
  loadConfiguration();

  // Load chat history for current page
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    const currentUrl = tabs[0].url;
    loadChatHistory(currentUrl);
  });

  // Save configuration
  saveConfigButton.addEventListener('click', function() {
    console.log('Save button clicked');
    const config = {
      apiKey: apiKeyInput.value.trim(),
      model: modelSelect.value
    };

    console.log('Collected config:', {
      hasApiKey: !!config.apiKey,
      model: config.model
    });

    if (!config.apiKey) {
      alert('Please enter an API key');
      return;
    }

    saveConfiguration(config);
  });

  sendButton.addEventListener('click', async function() {
    try {
      const message = userInput.value.trim();
      if (!message) return;

      const tabs = await chrome.tabs.query({active: true, currentWindow: true});
      const [tab] = tabs;
      if (!tab) {
        throw new Error('No active tab found');
      }

      console.log('Current tab ID:', tab.id);
      console.log('Ensuring content script is loaded...');
      
      await ensureContentScriptLoaded(tab.id);
      console.log('Content script verified, getting page content...');

      // Try multiple times to get page content
      let response = null;
      for (let i = 0; i < 3; i++) {
        try {
          console.log(`Attempting to get page content (attempt ${i + 1})...`);
          response = await chrome.tabs.sendMessage(tab.id, {action: "getPageContent"});
          if (response && response.pageContent) {
            console.log('Successfully got page content');
            break;
          }
        } catch (e) {
          console.log(`Get content attempt ${i + 1} failed:`, e);
          if (i < 2) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }

      if (!response || !response.pageContent) {
        throw new Error('Could not get page content after multiple attempts');
      }

      // Add OpenAI API call
      console.log('Calling OpenAI API...');
      const aiResponse = await callOpenAI(response.pageContent, message);
      console.log('Received AI response');

      // Save both user message and AI response to history
      const chatEntry = {
        message: message,
        response: aiResponse,
        timestamp: new Date().toISOString(),
        pageContent: response.pageContent
      };

      saveChatEntry(tab.url, chatEntry);
      
      // Display both messages
      displayMessage({
        message: message,
        timestamp: chatEntry.timestamp,
        isUser: true
      });
      displayMessage({
        message: aiResponse,
        timestamp: chatEntry.timestamp,
        isUser: false
      });
      
      userInput.value = '';
    } catch (error) {
      console.error('Error:', error);
      if (error.message.includes('API key')) {
        alert('Please configure your OpenAI API key first');
      } else if (error.message.includes('restricted page')) {
        alert('This extension cannot be used on browser system pages. Please try on a regular webpage.');
      } else {
        alert('Error: ' + error.message);
      }
    }
  });
});

// Configuration functions
function loadConfiguration() {
  const apiKeyInput = document.getElementById('api-key');
  const modelSelect = document.getElementById('model');
  
  if (!apiKeyInput || !modelSelect) {
    console.error('Configuration elements not found');
    return;
  }

  chrome.storage.sync.get(['apiKey', 'model'], function(data) {
    console.log('Raw loaded data:', data);
    
    if (data.apiKey) {
      apiKeyInput.value = data.apiKey;
      console.log('API key loaded successfully');
    }
    
    if (data.model) {
      modelSelect.value = data.model;
      console.log('Model loaded:', data.model);
    } else {
      modelSelect.value = 'gpt-3.5-turbo';
      console.log('Default model set:', modelSelect.value);
    }
  });
}

function saveConfiguration(config) {
  console.log('Attempting to save config:', {
    hasApiKey: !!config.apiKey,
    model: config.model
  });
  
  chrome.storage.sync.set(config, function() {
    if (chrome.runtime.lastError) {
      console.error('Save error:', chrome.runtime.lastError);
      alert('Error saving configuration: ' + chrome.runtime.lastError.message);
    } else {
      console.log('Configuration saved successfully');
      alert('Configuration saved!');
      
      // Verify the save by reading it back
      chrome.storage.sync.get(['apiKey', 'model'], function(data) {
        console.log('Verification - saved data:', {
          hasApiKey: !!data.apiKey,
          model: data.model
        });
      });
    }
  });
}

// Update the chat history functions
function loadChatHistory(url) {
  chrome.storage.local.get(url, function(data) {
    const history = data[url] || [];
    console.log('Loading chat history:', history);
    
    // Clear existing messages
    const chatHistory = document.getElementById('chat-history');
    chatHistory.innerHTML = '';
    
    // Display each message pair
    history.forEach(entry => {
      // Display user message
      displayMessage({
        message: entry.message,
        timestamp: entry.timestamp,
        isUser: true
      });
      
      // Display AI response if it exists
      if (entry.response) {
        displayMessage({
          message: entry.response,
          timestamp: entry.timestamp,
          isUser: false
        });
      }
    });
  });
}

function saveChatEntry(url, entry) {
  chrome.storage.local.get(url, function(data) {
    const history = data[url] || [];
    history.push({
      message: entry.message,
      response: entry.response, // Make sure to save the AI response
      timestamp: entry.timestamp,
      pageContent: entry.pageContent
    });
    
    chrome.storage.local.set({ [url]: history }, function() {
      console.log('Chat history saved:', history);
    });
  });
}

function displayMessage(entry) {
  const chatHistory = document.getElementById('chat-history');
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${entry.isUser ? 'user-message' : 'ai-message'}`;
  
  // Add timestamp
  const timestampDiv = document.createElement('div');
  timestampDiv.className = 'timestamp';
  const timeString = new Date(entry.timestamp).toLocaleTimeString();
  timestampDiv.textContent = `${entry.isUser ? 'You' : 'AI'} • ${timeString}`;
  
  // Add message content
  const contentDiv = document.createElement('div');
  contentDiv.textContent = entry.message;
  
  messageDiv.appendChild(timestampDiv);
  messageDiv.appendChild(contentDiv);
  
  chatHistory.appendChild(messageDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Add this helper function at the top level
async function ensureContentScriptLoaded(tabId) {
  try {
    // Check if we can access the tab
    const tab = await chrome.tabs.get(tabId);
    console.log('Current tab:', tab.url);

    // Check if we're on a restricted page
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      throw new Error('Cannot inject script into restricted page');
    }

    // Try to inject the script
    console.log('Attempting to inject content script...');
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    console.log('Script injection successful, waiting for initialization...');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to ping multiple times
    for (let i = 0; i < 3; i++) {
      try {
        console.log(`Ping attempt ${i + 1}...`);
        const response = await chrome.tabs.sendMessage(tabId, {action: "ping"});
        if (response && response.status === "ready") {
          console.log("Content script verified");
          return;
        }
      } catch (e) {
        console.log(`Ping attempt ${i + 1} failed:`, e);
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }
    throw new Error("Failed to verify content script");
    
  } catch (error) {
    console.error("Error ensuring content script:", error);
    throw error;
  }
}

// Add this function to handle OpenAI API calls
async function callOpenAI(pageContent, userMessage) {
  // Get saved configuration
  const config = await chrome.storage.sync.get(['apiKey', 'model']);
  
  if (!config.apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant analyzing webpage content."
        },
        {
          role: "user",
          content: `Context: ${pageContent}\n\nQuestion: ${userMessage}`
        }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
} 