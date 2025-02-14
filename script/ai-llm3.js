const axios = require('axios');

module.exports["config"] = {
    name: "llm",
    aliases: ["llm3"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Llama 3.1 70B Instruct-Turbo model created by Meta.",
    usage: "[prompt]",
    guide: "llm Explain quantum computing in simple terms.",
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
        senderID
    } = event;

    const statusUrl = url[0];
    const chatUrl = url[1];
    const query = args.join(" ");
    const model = "meta-llama/Llama-3.3-70B-Instruct-Turbo";

    if (!query) {
        chat.reply(font.monospace("Please provide a question!"));
        return;
    }

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

    const answering = await chat.reply(font.monospace("🕐 | Llama 3.3 70B Instruct-Turbo is Typing..."));
    
    let newVqd = '';

    try {
        // Fetch VQD token
        const response = await axios.get(statusUrl, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-accept': '1'
            }
        });
        const vqdToken = response.headers['x-vqd-4'];
        if (!vqdToken) throw new Error("VQD token could not be retrieved.");

        // Send query to AI
        const payload = {
            model,
            messages: conversationHistories[senderID]
        };
        const chatResponse = await axios.post(chatUrl, payload, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-4': newVqd, 'Content-Type': 'application/json'
            },
            responseType: 'stream',
        });

        let buffer = "";
        let finalMessage = "";

        await new Promise((resolve, reject) => {
            chatResponse.data.on("data", (chunk) => {
                buffer += chunk.toString();
                let endIndex;

                while ((endIndex = buffer.indexOf("\n")) !== -1) {
                    const line = buffer.slice(0, endIndex).trim();
                    buffer = buffer.slice(endIndex + 1);

                    if (line === "[DONE]") break;

                    if (line.startsWith("data: ")) {
                        const jsonString = line.slice(6).trim();
                        if (jsonString && jsonString !== "[DONE]") {
                            try {
                                const data = JSON.parse(jsonString);
                                if (data.message) finalMessage += data.message;
                            } catch (err) {
                                console.error("Error parsing chunk:", err);
                            }
                        }
                    }
                }
            });

            chatResponse.data.on("end",
                () => resolve());
            chatResponse.data.on("error",
                (err) => reject(err));
        });

        const cleanup = finalMessage.replace(/\*\*(.*?)\*\*/g, (_,
            text) => font.bold(text));

        conversationHistories[senderID].push({
            role: "assistant", content: finalMessage
        });

        const message = font.bold(" 🤖 | " + model.split("/").pop().toUpperCase()) + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18);
        answering.edit(message);
    } catch (error) {
        answering.edit(font.monospace("Failed to retrieve response from Llama: " + error.message));
    }
};