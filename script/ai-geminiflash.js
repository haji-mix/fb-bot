const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Store user-specific model selections
const userModelMap = new Map();

// Store conversation histories for each user
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
        const fileManager = new GoogleAIFileManager(atob(key));

        // Fetch available Gemini models
        const geminiModels = models.gemini;

        if (!geminiModels || geminiModels.length < 1) {
            chat.reply(font.thin("No models available. Please check the configuration."));
            return;
        }

        const defaultModelIndex = 0; // Default to the first model
        const defaultModel = geminiModels[defaultModelIndex];

        // Check if the user is switching models
        const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

        if (isSwitchingModel) {
            const modelNumber = parseInt(args[1]) - 1; // Convert to zero-based index
            if (modelNumber < 0 || modelNumber >= geminiModels.length) {
                chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${geminiModels.length}.`));
                return;
            }

            // Save the selected model for the user
            userModelMap.set(event.senderID, modelNumber);
            const modelName = geminiModels[modelNumber].split('/').pop();
            chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
            return;
        }

        // Get the selected model for the user (or default if not set)
        const selectedModelIndex = userModelMap.get(event.senderID) ?? defaultModelIndex;
        const selectedModel = geminiModels[selectedModelIndex];
        const modelName = selectedModel.split('/').pop().toUpperCase();

        // Initialize conversation history for the sender
        if (!conversationHistories[event.senderID]) {
            conversationHistories[event.senderID] = [];
        }

        const history = conversationHistories[event.senderID];

        // Handle 'clear', 'reset', etc., to clear history
        if (['clear', 'reset', 'forgot', 'forget'].includes(args[0]?.toLowerCase())) {
            conversationHistories[event.senderID] = [];
            chat.reply(font.thin("Conversation history cleared."));
            return;
        }

        // Handle empty prompt
        if (args.length === 0) {
            const modelList = geminiModels.map((model, index) => `${index + 1}. ${model.split('/').pop()}`).join('\n');
            chat.reply(
                font.bold("🤖 | Available Models:\n") +
                font.thin(modelList +
                "\n\nTo switch models, use: gemini model [number]\nExample: gemini model 2\nTo chat use: gemini [prompt]"
            ));
            return;
        }

        // Join the remaining arguments as the user's query
        const query = args.join(" ").trim();

        // Handle file attachments or reply to a message
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

                // Download the attachment
                const response = await axios.get(content, { responseType: 'arraybuffer' });
                mimeType = response.headers['content-type'];
                const fileExtension = mimeType.split('/')[1];
                const uniqueFileName = `file_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${fileExtension}`;
                const filePath = path.join(cacheFolderPath, uniqueFileName);

                fs.writeFileSync(filePath, response.data);

                // Upload the file
                const uploadResponse = await fileManager.uploadFile(filePath, {
                    mimeType,
                    displayName: `Attachment ${Date.now()}`
                });

                // Wait for the file to be processed and active
                await waitForFilesActive([uploadResponse.file], fileManager);

                fileData = {
                    mimeType,
                    fileUri: uploadResponse.file.uri
                };
            } catch (error) {
                chat.reply(font.thin("Failed to process the file: " + error.message));
                return;
            }
        }

        // Prepare to answer
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

            // Add the user query to history
            history.push({
                role: "user",
                parts: [{ text: query }]
            });

            // Create and manage chat session
            const chatSession = model.startChat({ history });

            // Send the user query message
            const result = await chatSession.sendMessage(query);
            const answer = result.response.text();

            // Append the AI response to history
            history.push({
                role: "model",
                parts: [{ text: answer }]
            });

            // Format the response
            const line = "\n" + '━'.repeat(18) + "\n";
            const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            const message = font.bold(`🤖 | ${modelName}`) + line + formattedAnswer + line + font.thin("◉ USE 'CLEAR' TO RESET CONVERSATION.");

            await answering.edit(message);
        } catch (error) {
            await answering.edit(font.thin("⚠️ | An error occurred: " + error.message));
        }
    }
};

async function waitForFilesActive(files, fileManager) {
    for (const file of files) {
        let fileStatus = await fileManager.getFile(file.name);
        while (fileStatus.state === "PROCESSING") {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 10_000));
            fileStatus = await fileManager.getFile(file.name);
        }
        if (fileStatus.state !== "ACTIVE") {
            throw Error(`File ${file.name} failed to process`);
        }
    }
}