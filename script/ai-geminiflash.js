const { GoogleGenerativeAI } = require("@google/generative-ai");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const userModelMap = new Map();

const conversationHistories = {};

module.exports = {
    config: {
        name: "gemini",
        aliases: ["gm"],
        isPrefix: false,
        version: "1.0.0",
        credits: "Kenneth Panio",
        role: 0,
        type: "artificial-intelligence",
        info: "Interact with Gemini AI. Switch between models dynamically.",
        usage: "[model] [number]/[prompt]",
        guide: "gemini [model] [number]/[prompt]\nExample: gemini model 2\nExample: gemini What is AI?",
        cd: 6
    },

    run: async ({ chat, args, event, font, global }) => {
        const { key, models } = global.api.workers.google;
        const genAI = new GoogleGenerativeAI(atob(key));

        const geminiModels = models.gemini;

        if (!geminiModels || geminiModels.length < 1) {
            chat.reply(font.thin("No models available. Please check the configuration."));
            return;
        }

        const defaultModelIndex = 0; 
        const defaultModel = geminiModels[defaultModelIndex];

        const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

        if (isSwitchingModel) {
            const modelNumber = parseInt(args[1]) - 1; 
            if (modelNumber < 0 || modelNumber >= geminiModels.length) {
                chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${geminiModels.length}.`));
                return;
            }

            userModelMap.set(event.senderID, modelNumber);
            const modelName = geminiModels[modelNumber].split('/').pop();
            chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
            return;
        }

        const selectedModelIndex = userModelMap.get(event.senderID) ?? defaultModelIndex;
        const selectedModel = geminiModels[selectedModelIndex];
        const modelName = selectedModel.split('/').pop().toUpperCase();


        if (!conversationHistories[event.senderID]) {
            conversationHistories[event.senderID] = [];
        }

        const history = conversationHistories[event.senderID];

    
        if (['clear', 'reset', 'forgot', 'forget'].includes(args[0]?.toLowerCase())) {
            conversationHistories[event.senderID] = [];
            chat.reply(font.thin("Conversation history cleared."));
            return;
        }

        if (args.length === 0) {
            const modelList = geminiModels.map((model, index) => `${index + 1}. ${model.split('/').pop()}`).join('\n');
            chat.reply(
                font.bold("🤖 | Available Models:\n") +
                font.thin(modelList +
                "\n\nTo switch models, use: gemini model [number]\nExample: gemini model 2\nTo chat use: gemini [prompt]"
            ));
            return;
        }

        const query = args.join(" ").trim();

        let fileData = null;
        let mimeType = null;

        if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
            const attachment = event.messageReply.attachments[0];
            const content = attachment.url;

            try {
                const cacheFolderPath = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheFolderPath)) {
                    fs.mkdirSync(cacheFolderPath);
                }

                const response = await axios.get(content, { responseType: 'arraybuffer' });
                mimeType = response.headers['content-type'];
                const fileExtension = mimeType.split('/')[1];
                const uniqueFileName = `file_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${fileExtension}`;
                const filePath = path.join(cacheFolderPath, uniqueFileName);

                fs.writeFileSync(filePath, response.data);

                fileData = {
                    inlineData: {
                        data: Buffer.from(response.data).toString('base64'),
                        mimeType
                    }
                };
            } catch (error) {
                chat.reply(font.thin("Failed to process the file: " + error.message));
                return;
            }
        }

        const answering = await chat.reply(font.thin(`🕐 | ${modelName} is Typing...`));

        try {
            const model = genAI.getGenerativeModel({
                model: selectedModel,
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE }
                ]
            });

            history.push({
                role: "user",
                parts: fileData ? [{ text: query }, fileData] : [{ text: query }]
            });

            const chatSession = model.startChat({ history });

            const result = await chatSession.sendMessage(query);
            const answer = result.response.text();

            history.push({
                role: "model",
                parts: [{ text: answer }]
            });

            const line = "\n" + '━'.repeat(18) + "\n";
            const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            const message = font.bold(`🤖 | ${modelName}`) + line + formattedAnswer + line + font.thin("◉ USE 'CLEAR' TO RESET CONVERSATION.");

            await answering.edit(message);
        } catch (error) {
            await answering.edit(font.thin("⚠️ | An error occurred: " + error.message));
        }
    }
};