# Web Page AI Assistant Chrome Extension

A Chrome extension that allows you to chat with an AI about any webpage's content using OpenAI's API.

## Installation Guide

### Install from Source (Developer Mode)

2. **Open Chrome Extensions Page**
   - Open Google Chrome
   - Go to `chrome://extensions/`
   - Or navigate through: Menu (⋮) > More Tools > Extensions

3. **Enable Developer Mode**
   - Look for the "Developer mode" toggle in the top-right corner
   - Turn it ON

4. **Load the Extension**
   - Click "Load unpacked" button in the top-left
   - Navigate to the folder containing the extension files
   - Select the folder and click "Open"

### Configuration

1. **Get OpenAI API Key**
   - Visit [OpenAI's website](https://platform.openai.com/)
   - Create an account or log in
   - Navigate to API keys section
   - Create a new API key

2. **Configure the Extension**
   - Click the extension icon in Chrome's toolbar
   - Enter your OpenAI API key in the settings
   - Select your preferred model
   - Click "Save Configuration"

## Usage

1. Navigate to any webpage
2. Click the extension icon
3. Type your question about the page content
4. Click Send or press Enter
5. The AI will respond based on the current page's content

## Features

- Chat with AI about any webpage content
- Saves chat history per webpage
- Configurable OpenAI model selection
- Secure API key storage
- Clean and intuitive interface

## Notes

- The extension cannot be used on browser system pages (chrome://, edge://, about:)
- Requires a valid OpenAI API key
- API usage will incur charges according to OpenAI's pricing

## Privacy

- Your API key is stored securely in Chrome's storage
- Chat history is stored locally in your browser
- Page content is only sent to OpenAI when you ask a question 