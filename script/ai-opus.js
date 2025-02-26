const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "voids",
    aliases: ["void", "vd"], // Updated command name and aliases
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    isPrefix: false,
    type: "artificial-intelligence",
    info: "Interact with AI models via VOID API. Switch between models dynamically.",
    usage: "[model] [number]/[prompt]",
    guide: "voids [model] [number]/[prompt]\nExample: voids model 2\nExample: voids What is quantum computing?",
    cd: 6,
};

// Store user-specific model selections
const userModelMap = new Map();

// Store conversation histories for each user
const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    const mono = txt => font.monospace(txt);
    const { senderID } = event;
    let query = args.join(" ");

    // Available models
    const availableModels = [
        "gpt-4o-mini-free",
        "gpt-4o-mini",
        "gpt-4o-free",
        "gpt-4-turbo-2024-04-09",
        "gpt-4o-2024-08-06",
        "grok-2",
        "grok-2-mini",
        "claude-3-opus-20240229",
        "claude-3-opus-20240229-gcp",
        "claude-3-sonnet-20240229",
        "claude-3-5-sonnet-20240620",
        "claude-3-haiku-20240307",
        "claude-2.1",
        "gemini-1.5-flash-exp-0827",
        "gemini-1.5-pro-exp-0827"
    ];

    // Check if the user is switching models
    const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

    if (isSwitchingModel) {
        const modelNumber = parseInt(args[1]) - 1; // Convert to zero-based index
        if (modelNumber < 0 || modelNumber >= availableModels.length) {
            chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${availableModels.length}.`));
            return;
        }

        // Save the selected model for the user
        userModelMap.set(senderID, modelNumber);
        const modelName = availableModels[modelNumber];
        chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
        return;
    }

    // Get the selected model for the user (or default if not set)
    const selectedModelIndex = userModelMap.get(senderID) ?? 1; // Default to Claude-3-Opus
    const selectedModel = availableModels[selectedModelIndex];
    const modelName = selectedModel.toUpperCase();

    // Handle 'clear', 'reset', etc., to clear history
    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }

    // Handle empty prompt
    if (args.length === 0) {
        const modelList = availableModels.map((model, index) => `${index + 1}. ${model}`).join('\n');
        chat.reply(
            font.bold("🤖 | Available Models:\n") +
            font.thin(modelList +
            "\n\nTo switch models, use: voids model [number]\nExample: voids model 2\nTo chat use: voids [prompt]"
        ));
        return;
    }

    // Join the remaining arguments as the user's query
    query = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

    // Notify the user that the bot is typing
    const answering = await chat.reply(mono(`🕐 | ${modelName} is Typing...`));

    // Initialize conversation history if it doesn't exist
    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    // API configuration
    const apiUrl = 'https://api.voids.top/v1/chat/completions';
    const headers = {
        'accept': 'application/json, text/event-stream',
        'accept-language': 'ru,en;q=0.9',
        'content-type': 'application/json',
        'priority': 'u=1, i',
        'sec-ch-ua': '"Chromium";v="124", "YaBrowser";v="24.6", "Not-A.Brand";v="99", "Yowser";v="2.5"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'plugins': '0',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'x-requested-with': 'XMLHttpRequest',
        'Referer': apiUrl,
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    const data = {
        messages: conversationHistories[senderID],
        model: selectedModel
    };

    const getResponse = async () => {
        return axios.post(apiUrl, data, { headers });
    };

    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease try again later.";

    while (attempts < maxRetries && !success) {
        try {
            const response = await getResponse();
            answer = response.data.choices[0].message.content.trim();
            success = true;
        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(mono(`No response from VOID API. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(mono("No response from VOID API. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({ role: "assistant", content: answer });

        // Format the response
        const line = "\n" + '━'.repeat(18) + "\n";
        const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        const message = font.bold(`🌐 | ${modelName}`) + line + formattedAnswer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);
         answering.edit(message);

    }
};