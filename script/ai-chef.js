const {
    GoogleGenerativeAI
} = require("@google/generative-ai");
const {
    GoogleAIFileManager
} = require("@google/generative-ai/server");
const { HarmBlockThreshold, HarmCategory } = require("@google/generative-ai");
const axios = require("axios");
const fs = require("fs");
const path = require("path");

const conversationHistories = {}; // Use an object to manage conversation histories

async function waitForFilesActive(files, fileManager) {
    console.log("Waiting for file processing...");
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
    console.log("...all files ready\n");
}

module.exports = {
    config: {
        name: "chef",
        aliases: ["adobo"],
        isPrefix: false,
        version: "1.0.0",
        credits: "Kenneth Panio",
        role: 0,
        type: "artificial-intelligence",
        info: "Interact with Chef AI.",
        usage: "[prompt or reply to a photo, audio, or video]",
        guide: "Chef How to Cook?",
        cd: 6
    },

    run: async ({
        chat, args, event, font, global
    }) => {
        const safetySettings = [{
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        }];
        const {
            key,
            models
        } = global.api.workers.google;
        const genAI = new GoogleGenerativeAI(atob(key));
        const fileManager = new GoogleAIFileManager(atob(key));
        const model = genAI.getGenerativeModel({
            model: models.gemini[12], 
            systemInstruction: "As an expert Filipino chef, also known as Chef Adobo, you always suggest, teach how to cook, and provide recipes and ingredients. You come up with creative flavor experiments and also suggest the best foods for gaining weight while maintaining a healthy diet suitable for calisthenics. Your priority is always affordable foods that can be found at home in the Philippines. keep your response sometimes having emoji to make it look appealing and fun!",
            safetySettings
        });
        const cacheFolderPath = path.join(__dirname, "cache");
        const mono = txt => font.monospace(txt);

        const senderID = event.senderID;
        let query = args.join(" ").trim();
        let fileData = null;
        let mimeType = null;
        let content = null;

        // Initialize conversation history for the sender
        if (!conversationHistories[senderID]) {
            conversationHistories[senderID] = [];
        }

        const history = conversationHistories[senderID];

        // Handle 'clear', 'reset', etc., to clear history
        if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
            conversationHistories[senderID] = [];
            chat.reply(mono("Conversation history cleared."));
            return;
        }

        // Handle file attachments or reply to a message
        if (event.type === "message_reply" && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
            const attachment = event.messageReply.attachments[0];
            content = attachment.url;

            try {
                if (!fs.existsSync(cacheFolderPath)) {
                    fs.mkdirSync(cacheFolderPath);
                }

                // Download the attachment
                const response = await axios.get(content, {
                    responseType: 'arraybuffer'
                });
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

                // Set default query based on mime type
                if (mimeType.startsWith('image/')) {
                    query = args.join(" ") || "What is this image?";
                } else if (mimeType.startsWith('audio/')) {
                    query = args.join(" ") || "What is this audio?";
                } else if (mimeType.startsWith('video/')) {
                    query = args.join(" ") || "What is this video?";
                } else if (mimeType === 'application/pdf') {
                    query = args.join(" ") || "Can you summarize this document?";
                } else {
                    chat.reply(mono("Unsupported attachment type!"));
                    return;
                }
            } catch (error) {
                chat.reply(mono("Failed to process the file: " + error.message));
                return;
            }
        }

        // Handle regex for direct link detection
        const linkRegex = /https?:\/\/[^\s]+(\.pdf|\.jpg|\.jpeg|\.png|\.mp3|\.mp4)/i;
        const linkMatch = query.match(linkRegex);

        if (linkMatch) {
            content = linkMatch[0];

            try {
                if (!fs.existsSync(cacheFolderPath)) {
                    fs.mkdirSync(cacheFolderPath);
                }

                // Download the file from the link
                const response = await axios.get(content, {
                    responseType: 'arraybuffer'
                });
                mimeType = response.headers['content-type'];
                const fileExtension = mimeType.split('/')[1];
                const uniqueFileName = `file_${Date.now()}_${Math.floor(Math.random() * 1e6)}.${fileExtension}`;
                const filePath = path.join(cacheFolderPath, uniqueFileName);

                fs.writeFileSync(filePath, response.data);

                // Upload the file
                const uploadResponse = await fileManager.uploadFile(filePath, {
                    mimeType,
                    displayName: `Downloaded File ${Date.now()}`
                });

                // Wait for the file to be processed and active
                await waitForFilesActive([uploadResponse.file], fileManager);

                fileData = {
                    mimeType,
                    fileUri: uploadResponse.file.uri
                };

              query = args.join(" ");

            } catch (error) {
                chat.reply(mono("Failed to process the file from the link: " + error.message));
                return;
            }
        }

        // Ensure there is a query
        if (!query) {
            chat.reply(mono("Please provide a question or reply to an attachment!"));
            return;
        }

        // Add the user query to history
        history.push({
            role: "user",
            parts: [{
                text: query
            }]
        });

        // Prepare to answer
        const answering = await chat.reply(mono("🍽️ | Answering..."));

        try {
            // Create and manage chat session
            const chatSession = model.startChat({
                history: [
                    ...history,
                    fileData ? {
                        role: "user",
                        parts: [{
                            fileData: {
                                mimeType: fileData.mimeType, fileUri: fileData.fileUri
                            }
                        }]
                    } : null,
                    {
                        role: "user",
                        parts: [{
                            text: query
                        }]
                    }
                ].filter(Boolean)
            });

            // Send the user query message
            const result = await chatSession.sendMessage(query);

            const answer = result.response.text();

            // Append the AI response to history
            history.push({
                role: "model",
                parts: [{
                    text: answer
                }]
            });

            const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
            const line = "\n" + '━'.repeat(18) + "\n";

            const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            const message = font.bold("👨‍🍳 | CHEF ADOBO".toUpperCase()) + line + formattedAnswer + line + mono("◉ USE 'CLEAR' TO RESET CONVERSATION.\n◉ REPLY THE PHOTO/AUDIO/VIDEO/PDF TO SCAN.");

            await answering.edit(message);

            if (codeBlocks.length > 0) {
                const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
            const uniqueFileName = `code_snippet_${Date.now()}_${Math.floor(Math.random() * 1e6)}.txt`;
            const filePath = path.join(cacheFolderPath, uniqueFileName);

            fs.writeFileSync(filePath, allCode, 'utf8');

            const fileStream = fs.createReadStream(filePath);
            await chat.reply({ attachment: fileStream });

            fs.unlinkSync(filePath);
        }
        } catch (err) {
             answering.edit(mono("⚠️ | An error occurred while processing your request. " + err.message));
        }
    },
};