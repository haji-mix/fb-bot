const axios = require("axios");
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "dsl",
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with DeepSeek-R1-Distill-Llama-70B AI.",
    usage: "[prompt]",
    guide: "dsl hello!",
    cd: 6
};

const conversationHistories = {};
let includeMind = false;

module.exports["run"] = async ({
    chat, args, event, font, global
}) => {
    const deepinfraUrl = "https://api.deepinfra.com/v1/openai/chat/completions";
    const model = "deepseek-ai/DeepSeek-R1-Distill-Llama-70B";
    const name = model.split('/').pop().toUpperCase();

    const mono = txt => font.monospace(txt);
    const {
        threadID,
        senderID
    } = event;
    let query = args.join(" ").toLowerCase();

    if (query.toLowerCase() === 'toggle') {
        includeMind = !includeMind;
        chat.reply(mono(`Deep Thinking has been ${includeMind ? 'enabled': 'disabled'}.`));
        return;
    }

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

    if (!query) {
        chat.reply(mono("Please provide a question or ask me anything!"));
        return;
    }

    const answering = await chat.reply(mono("🕐 | Generating response..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

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
        const mindMatch = answer.match(/([\s\S]*?)<\/think>/);
        let mindContent = "";
        if (mindMatch) {
            mindContent = mindMatch[1] + "\n";
            conversationHistories[senderID].push({
                role: "assistant", content: mindContent
            });
            if (!includeMind) {
                answer = answer.replace(/[\s\S]*?<\/think>/, "").trim();
            }
        }

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + '━'.repeat(18) + "\n";

        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        let message = font.bold(" 🐋 | " + name) + line + (includeMind ? mindContent: '') + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH DEEPTHINK.`);

         answering.edit(message);

    }
};