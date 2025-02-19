const axios = require("axios");
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "codestral",
    isPrefix: false,
    aliases: ["mamba"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Open Codestral Mamba AI.",
    usage: "[prompt]",
    guide: "codestral create a node js program?",
    cd: 6
};

const conversationHistories = {};

module.exports["run"] = async ({
    chat, args, event, font, global
}) => {
    const apiUrl = "https://api.mistral.ai/v1/chat/completions";
    const userAgent = randomUseragent.getRandom(ua => ua.browserName === 'Firefox');
    const {
        threadID,
        senderID
    } = event;
    const query = args.join(" ");

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(font.monospace("Conversation history cleared."));
        return;
    }

    if (!query) {
        chat.reply(font.monospace("Please provide a question!"));
        return;
    }

    const answering = await chat.reply(font.monospace("🕐 | Generating response..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

    const getResponse = async () => {
        return axios.post(apiUrl, {
            model: "open-codestral-mamba",
            messages: conversationHistories[senderID]
        }, {
            headers: {
                'Authorization': 'Bearer qedBW8C6dZbnPvD7LeL0boDzKK5gZDJu',
                'Content-Type': 'application/json',
                'User-Agent': userAgent,
                'Referer': 'https://aiassistantbot.surge.sh/',
            }
        });
    };

    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease use other models; get started with 'help'.";

    while (attempts < maxRetries && !success) {
        try {
            const response = await getResponse();
            answer = response.data.choices[0].message.content;
            success = true;
        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(font.monospace(`No response from Codestral. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(font.monospace("No response from Codestral. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({
            role: "assistant", content: answer
        });

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + '━'.repeat(18) + "\n";

        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        const message = font.bold(" 🤖 | Open-Codestral-Mamba".toUpperCase()) + line + answer + line + font.monospace(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

        await answering.edit(message);

                if (codeBlocks.length > 0) {
    const isHtml = codeBlocks.some(block => /<html[\s>]/i.test(block) || /<!DOCTYPE html>/i.test(block));

    if (isHtml) {
        const allCode = codeBlocks
            .map(block => block.replace(/^```[a-zA-Z]+\s*[^\n]*\n/, '').replace(/```$/, '').trim())
            .join("\n\n\n");
            
            const uitocode = "https://codetoui.onrender.com";

        try {
            const response = await axios.post(uitocode + "/submit-html", {
                htmlContent: allCode
            }, {
                headers: { "Content-Type": "application/json" }
            });

            const result = response.data;
            const shortUrl = await chat.shorturl(uitocode + result.url);
            const screenshot = await chat.stream(`https://image.thum.io/get/width/1920/crop/400/fullpage/noanimate/${shortUrl}`);

            chat.reply({ body: shortUrl, attachment: screenshot });
        } catch (error) {
            console.error("Error submitting HTML:", error);
        }
    }
}
    }
};