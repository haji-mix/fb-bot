const axios = require("axios");
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "ms3",
    aliases: ["msm3", "mistralsm3"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Mistral-Small-24B-Instruct-2501 AI.",
    usage: "[prompt]",
    guide: "ms3 hello!",
    cd: 6
};

const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    const deepinfraUrl = "https://api.deepinfra.com/v1/openai/chat/completions";
    const model = "mistralai/Mistral-Small-24B-Instruct-2501";
    const name = model.split('/').pop().toUpperCase();

    const mono = txt => font.monospace(txt);
    const { threadID, senderID } = event;
    const query = args.join(" ").toLowerCase();

    if (['clear', 'reset', 'forgot', 'forget'].includes(query)) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }

    if (!query) {
        chat.reply(mono("Please provide a question or ask me anything!"));
        return;
    }

    const answering = await chat.reply(mono("🕐 | Generating response..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    const getResponse = async () => {
        return axios.post(deepinfraUrl, {
            model: model,
            messages: conversationHistories[senderID],
            stream: false,
            max_tokens: 32000
        }, {
            headers: {
                'Accept': 'text/event-stream',
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/json',
                'Origin': 'https://deepinfra.com',
                'Referer': 'https://deepinfra.com/',
                'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
                'sec-ch-ua-mobile': '?1',
                'sec-ch-ua-platform': '"Android"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-site',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'X-Deepinfra-Source': 'web-page'
            }
        });
    };

    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease try again later.";

    while (attempts < maxRetries && !success) {
        try {
            const response = await getResponse();
            answer = response.data.choices?.[0]?.message?.content || "No response received.";
            success = true;
        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(mono(`No response from DeepInfra AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(mono("No response from DeepInfra AI. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        let message = font.bold(" 🤖 | " + name) + "\n" + '━'.repeat(18) + "\n" + answer + "\n" + '━'.repeat(18) + "\n" + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

        await answering.edit(message);

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];

        if (codeBlocks.length > 0) {
            const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
            const cacheFolderPath = path.join(__dirname, "cache");

            if (!fs.existsSync(cacheFolderPath)) {
                fs.mkdirSync(cacheFolderPath);
            }

            const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
            const filePath = path.join(cacheFolderPath, uniqueFileName);

            fs.writeFileSync(filePath, allCode, 'utf8');

            const fileStream = fs.createReadStream(filePath);
            await chat.reply({ attachment: fileStream });

            fs.unlinkSync(filePath);
        }
    }
};
