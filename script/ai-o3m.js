const axios = require('axios');

module.exports["config"] = {
    name: "o3m",
    aliases: ["o3"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with o3-mini, an OpenAI Fastest AI model.",
    usage: "[prompt]",
    guide: "o3m Explain quantum computing in simple terms.",
    cd: 6
};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    const { url, models } = global.api.workers.duckgo;
    const { threadID, senderID } = event;

    if (!url || url.length < 2 || !models || models.length < 5) {
        chat.reply(font.thin("API configuration is incorrect or missing."));
        return;
    }

    const statusUrl = url[0];
    const chatUrl = url[1];
    const query = args.join(" ");
    const model = models[4];

    if (!query) {
        chat.reply(font.thin("Please provide a question!"));
        return;
    }

    const answering = await chat.reply(font.monospace("🕐 | O3-mini is Typing..."));

    try {
        const response = await axios.get(statusUrl, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-accept': '1'
            }
        });
        
        const newVqd = response.headers['x-vqd-4'];
        if (!newVqd) throw new Error('Failed to initialize chat. No VQD token found.');

        const messages = [{ role: 'user', content: query }];
        const fetchResponse = await axios.post(chatUrl, { model, messages }, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-4': newVqd,
                'Content-Type': 'application/json'
            }
        });
        
        const finalMessage = fetchResponse.data.match(/"message":"(.*?)"/g)
            ?.map(m => m.replace(/"message":"|"/g, ''))
            .join('');

        const cleanup = finalMessage.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        const message = font.bold(" 🤖 | " + model.split('/').pop().toUpperCase()) + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18);
        
        answering.edit(message);
    } catch (error) {
        answering.edit(font.thin("Error: " + error.message));
    }
};
