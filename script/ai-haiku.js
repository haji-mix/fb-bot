const axios = require('axios');

module.exports["config"] = {
    name: "haiku",
    aliases: ["claude3",
        "haiku",
        "claude"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with AI Claude 3 Haiku model.",
    usage: "[prompt]",
    guide: "haiku Explain quantum computing in simple terms.",
    isPremium: true,
    limit: 10,
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
    const model = models[1];

    if (!query) {
        chat.reply(font.monospace("Please provide a question!"));
        return;
    }

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

    const answering = await chat.reply(font.monospace("🕐 | Claude-3 Haiku is Typing..."));

    let newVqd = '';

    // Initialize the VQD token
    try {
        const response = await axios.get(statusUrl, {
            headers: {
                'x-vqd-accept': '1'
            }
        });
        newVqd = response.headers['x-vqd-4'];
        if (!newVqd) {
            throw new Error('Failed to initialize chat. No VQD token found.');
        }
    } catch (error) {
        answering.edit(font.thin("Initialization error: " + error.message));
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
                'x-vqd-4': newVqd, 'Content-Type': 'application/json'
            },
            responseType: 'stream',
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
                const message = font.bold(" 🤖 | " + model.split('/').pop().toUpperCase()) + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18);
                answering.edit(message);
            });

        fetchResponse.data.on('error',
            (err) => {
                answering.edit(font.thin("Error during streaming response: " + err.message));
            });

    } catch (error) {
        answering.edit(font.thin("Failed to retrieve response from Claude 3 Haiku: " + error.message));
    }
};