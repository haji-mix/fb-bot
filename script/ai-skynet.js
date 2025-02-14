const axios = require('axios');

module.exports["config"] = {
    name: "skynet",
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with skynet ai a biggest threat to humanities.",
    usage: "[prompt]",
    guide: "skynet how to end this world?",
    cd: 6
};

const conversationHistories = {};

module.exports["run"] = async ({
    chat, args, event, font, global
}) => {
    const {
        url,
        models
    } = global.api.workers.duckgo;
    const {
        threadID,
        senderID
    } = event;

    const statusUrl = url[0];
    const chatUrl = url[1];
    const query = args.join(" ");
    const model = models[0];

    if (!query) {
        chat.reply(font.monospace("🤖 | Please provide a message would you like to ask!"));
        return;
    }

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

    const answering = await chat.reply(font.monospace("🤖 | Skynet - Generating Response..."));

    let newVqd = '';

    // Initialize the VQD token
    try {
        const response = await axios.get(statusUrl, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-accept': '1'
            }
        });
        newVqd = response.headers['x-vqd-4'];
        if (!newVqd) {
            throw new Error('Failed to initialize chat. No VQD token found.');
        }
    } catch (error) {
        answering.edit(font.monospace("Initialization error: " + error.message));
        return;
    }

    // Send the request and process the response
    const messages = [{
        role: 'user',
        content: query
    }];

    try {
        const fetchResponse = await axios.post(chatUrl, {
            model, messages
        }, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-4': newVqd, 'Content-Type': 'application/json'
            }
        });

        let buffer = '';
        let finalMessage = '';
        fetchResponse.data.on('data', (chunk) => {
            buffer += chunk.toString();

            let endIndex;
            while ((endIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, endIndex).trim();
                buffer = buffer.slice(endIndex + 1);

                if (line === '[DONE]') break;

                if (line.startsWith('data: ')) {
                    const jsonString = line.slice(6).trim();

                    if (jsonString && jsonString !== '[DONE]') {
                        try {
                            const data = JSON.parse(jsonString);
                            if (data.message) {
                                finalMessage += data.message;
                            }
                        } catch (err) {
                            console.error('Error parsing chunk:', err);
                        }
                    }
                }
            }
        });

        fetchResponse.data.on('end',
            () => {
                if (buffer.trim() !== '') {
                    try {
                        const data = JSON.parse(buffer);
                        if (data.message) {
                            finalMessage += data.message;
                        }
                    } catch (err) {
                        console.error('Error parsing remaining buffer:', err);
                    }
                }

                conversationHistories[senderID].push({
                    role: "assistant", content: finalMessage
                });

                const cleanup = finalMessage.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
                const message = font.bold(" 🛰️ | SKYNET-T-4800") + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18);
                answering.edit(message);
            });

        fetchResponse.data.on('error',
            (err) => {
                answering.edit(font.monospace("Error during streaming response: " + err.message));
            });

    } catch (error) {
        answering.edit(font.monospace("Failed to retrieve response from Skynet: " + error.message));
    }
};