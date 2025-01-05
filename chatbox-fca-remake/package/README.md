---

# Chatbox-FCA-Remake - Unofficial Facebook Chat API

**Chatbox-FCA-Remake** is a fork of the original [fca-unofficial](https://github.com/azlux/facebook-chat-api) repository. This version includes new features and updates that are integrated faster than the main repository. Please note that while new features offer added functionality, they may also introduce bugs.

---

## Overview

The **Chatbox-FCA-Remake** API allows you to automate Facebook chat functionalities by emulating the browser's GET/POST requests. Unlike the official API, it does not use an authentication token and instead requires the **AppState** (session information) from a previously authenticated Facebook session, which can be obtained using third-party tools.

---

## Important Notes

### **Login via Credentials Supported**

```javascript
login({
    email: "your_email",
    password: "your_password"
}, (err, api) => {
    if(err) return console.error(err);
});
```


### **AppState Support**

```javascript
login({
    appState: JSON.parse(fs.readFileSync('appstate.json', 'utf8'))
}, (err, api) => {
    if(err) return console.error(err);
});
```

To use the API, you need to provide an **AppState** from a previously authenticated session. You can retrieve and even update your **AppState** with the **`api.getAppState()`** function after logging in.

- **Kiwi Browser & c3c-ufc-utility Extension**: Use the **Kiwi Browser** along with the **c3c-ufc-utility extension** to extract the **AppState** after logging into Facebook manually.

Once you have the **AppState**, load it into the API to authenticate. You can also use **`api.getAppState()`** to update the AppState during your session.

Please use the API responsibly to avoid account bans, which may result from excessive automation or spamming.

---

## New Features

### 1. **Bypass Automatic Behavior Detection**

This feature helps bypass Facebook's behavior detection mechanisms, reducing the likelihood that your bot's activity will be flagged as automated.

### 2. **Auto Refresh for fb_dtsg Token**

The **AutoRefreshFbDtsg** feature automatically refreshes the **fb_dtsg** token, ensuring your session remains active without needing to log in again. This is especially useful as **fb_dtsg** tokens expire periodically.

![Example 1](https://i.imgur.com/U8RfmLc.jpeg)
![Example 2](https://i.imgur.com/WKXm6NR.jpeg)

If other FCAs lack this feature, they may encounter errors, as shown below:
![Error Example](https://i.imgur.com/vdzHs0i.jpeg)

---

## How to Obtain AppState

### **Kiwi Browser & c3c-ufc-utility Extension**

1. Install the **Kiwi Browser**.
2. Add the **c3c-ufc-utility extension** to the browser.
3. Use the extension to extract your **AppState** (session cookies) after manually logging into Facebook.
4. Save the **AppState** as a `appstate.json` file and load it into your API configuration.

For detailed instructions, refer to the official [c3c-ufc-utility GitHub release](https://github.com/c3cbot/c3c-ufc-utility/releases).

---

## Installation

To install **chatbox-fca-remake**, run the following npm command:

```bash
npm install chatbox-fca-remake
```

For the latest development version directly from GitHub:

```bash
npm install git+https://github.com/your/repository.git
```

---

## Example Usage

Here’s an example of bot and how to log in using your **AppState**:

```javascript
const fs = require("fs");
const login = require("chatbox-fca-remake");

// Simple bot that responds when you say "test" or "/stop"
login({
    appState: JSON.parse(fs.readFileSync('test.json', 'utf8'))  // Load AppState from the saved JSON file
}, (err, api) => {
    if (err) return console.error(err);  // Handle login errors

    // Set the bot's options for its behavior and connection
    api.setOptions({
        forceLogin: true,  // Force login even if the session is active
        listenEvents: true,  // Enable event listening
        logLevel: "silent",  // Set log level to silent (no logs)
        updatePresence: true,  // Keep the presence (status) updated
        selfListen: false,  // Do not listen to the bot's own messages
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0",  // Set custom user agent for the bot
        online: false,  // Keep the bot offline or Set it to true if you want to see bots online status.
        autoMarkDelivery: false,  // Disable auto marking of delivery status
        autoMarkRead: false  // Disable auto marking of messages as read
    });

    // Start listening for incoming messages and events
    const stopListening = api.listenMqtt((err, event) => {
        if (err) return console.error(err);  // Handle any errors while listening

        // Switch case to handle different types of events
        switch (event.type) {
            case "message":
                if (event.body === '/stop') {  // If the message is "/stop"
                    api.sendMessage("Goodbye…", event.threadID);  // Send "Goodbye" message
                    return stopListening();  // Stop listening to events
                }
                if (event.body.toLowerCase() === 'test') {  // If the message is "test" (case-insensitive)
                    api.sendMessage("TEST BOT: " + event.body, event.threadID);  // Send a test response
                }
                break;
            case "event":
                console.log(event);  // Log any other event type
                break;
        }
    });
});
```

---

## Main Functionality

- **Sending Messages:**
    - Text Messages
    - Sticker Messages
    - Image/File Attachments
    - URLs
    - Emojis

- **Listening for Messages:**
    - Real-time message listening
    - Event listeners for actions like user joining or leaving a chat

---

## FAQ

1. **How do I log in without credentials?**
   - After logging into Facebook manually, extract your **AppState** using the **c3c-ufc-utility extension**. This is the only supported authentication method.

2. **Can I listen for messages from the bot?**
   - Yes, the bot can listen to incoming messages and automatically respond. You can customize the responses based on message content.

3. **Can I send media like images or files?**
   - Yes, you can send images or files as attachments, as demonstrated in the example usage.

4. **How do I keep my session alive?**
   - Once your **AppState** is saved, you can reuse it to authenticate without needing to log in again.

---

## Projects Using This API

- [c3c](https://github.com/lequanglam/c3c) - A customizable bot with Facebook and Discord support.
- [Messenger-CLI](https://github.com/AstroCB/Messenger-CLI) - Command-line interface for Facebook Messenger.

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.

---

## Contact & Community

For support or inquiries, contact:

- [JR Busaco](https://www.facebook.com/jr.busaco.271915)
- [Kenneth Panio](https://www.facebook.com/haji.atomyc2727)

Join our **ChatBot Community**:

- [ChatBot Community](https://www.facebook.com/groups/coders.dev)

---

**Note:** This project is an unofficial Facebook chat API. Please use it responsibly and in accordance with Facebook's terms of service.

--- 