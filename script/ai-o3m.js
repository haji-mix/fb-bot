const axios = require('axios');

// Store user-specific model selections
const userModelMap = new Map();

module.exports["config"] = {
    name: "duckchat",
    aliases: ["dc", "dg", "duckgo"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with various AI models. Use a default model or switch models.",
    usage: "[model] [number]/[prompt]",
    guide: "duckchat [model] [number]/[prompt]\nExample: duckchat model 1 Example2: duckchat hello",
    cd: 6
};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    const { url, models } = global.api.workers.duckgo;
    const { threadID, senderID } = event;

    if (!url || url.length < 2 || !models || models.length < 1) {
        chat.reply(font.thin("API configuration is incorrect or missing."));
        return;
    }

    const defaultModelIndex = 4;
    const defaultModel = models[defaultModelIndex];

    const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

    if (isSwitchingModel) {
        const modelNumber = parseInt(args[1]) - 1;
        if (modelNumber < 0 || modelNumber >= models.length) {
            chat.reply(font.thin("Invalid model number. Please choose a number between 1 and " + models.length + "."));
            return;
        }

        userModelMap.set(senderID, modelNumber);
        const modelName = models[modelNumber].split('/').pop();
        chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
        return;
    }

    const selectedModelIndex = userModelMap.get(senderID) ?? defaultModelIndex;
    const selectedModel = models[selectedModelIndex];

    if (args.length === 0) {
        const modelList = models.map((model, index) => `${index + 1}. ${model.split('/').pop()}`).join('\n');
        chat.reply(
            font.bold("🤖 | Available Models:\n") +
            font.thin(modelList +
            "\n\nTo switch models, use: duckchat model [number]\nExample: duckchat model 2\nTo chat use: duckchat hello"
        ));
        return;
    }

    let query = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

    const answering = await chat.reply(font.thin(`🕐 | ${selectedModel.split('/').pop()} is Typing...`));

    try {
        const statusUrl = url[0];
        const chatUrl = url[1];

        const response = await axios.get(statusUrl, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-accept': '1'
            }
        });

        const newVqd = response.headers['x-vqd-4'];
        if (!newVqd) throw new Error('Failed to initialize chat. No VQD token found.');

        const messages = [{ role: 'user', content: query }];
        const fetchResponse = await axios.post(chatUrl, { model: selectedModel, messages }, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'x-vqd-4': newVqd,
                'Content-Type': 'application/json'
            }
        });

        const rawData = fetchResponse.data.match(/"message":"(.*?)"/g)
            ?.map(m => m.match(/"message":"(.*?)"/)[1])
            .join('');

        const wrap_linebreaks = rawData.replace(/\\+n/g, '\n');
        const fix_quote = wrap_linebreaks.replace(/\\(.+?)\\/g, '"$1"');
        const cleanup = fix_quote.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        const message = font.bold("🛡️ | " + "DUCKGO AI") + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18) + font.thin("\nModel: " + selectedModel.split('/').pop());

        answering.edit(message);
    } catch (error) {
        answering.edit(font.thin("Error: " + error.message));
    }
};