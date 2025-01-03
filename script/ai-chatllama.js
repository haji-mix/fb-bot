const axios = require('axios');

module.exports["config"] = {
    name: "autogpt",
    aliases: ["chatllama", "aiassistant"],
    info: "Chat with Llama AI through Autonomous API.",
    usage: "[message]",
    credits: "Kenneth Panio",
    version: "1.0.0",
    isPrefix: false,
    cd: 5,
}

module.exports["run"] = async ({ chat, args, font }) => {
    const mono = txt => font.monospace(txt);
    const prompt = args.join(" ");

    if (!prompt) {
        return chat.reply(mono("Please provide your message!"));
    }

    const answering = await chat.reply(mono("Processing your request..."));

    try {
        const payload = {
            messages: btoa(prompt),
            threadId: "llama",
            stream: false,
            aiAgent: "llama"
        };

        const headers = {
            'Content-Type': 'application/json',
            'Country-Code': 'PH',
            'Time-Zone': 'Asia/Manila',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.56 Mobile Safari/537.36',
            'Referer': 'https://www.autonomous.ai/anon/llama'
        };

        const response = await axios.post('https://chatgpt.autonomous.ai/api/v1/ai/chat', payload, { headers });

        const message = response?.data?.choices?.[0]?.message?.content || "No response received from the AI.";
        answering.unsend();
        chat.reply(message);
    } catch (error) {
        answering.unsend();
        chat.reply(mono(error.message));
    }
};
