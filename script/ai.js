const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

const conversationHistories = {};

module.exports["config"] = {
    name: "cf",
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    isPrefix: false,
    type: "artificial-intelligence",
    info: "Interact with various AI models.",
    usage: "[modelname] [prompt]",
    guide: "cf mistral How does nuclear fusion work?",
    cd: 6
};

module.exports["run"] = async ({
    chat, args, event, font, global
}) => {
    const {
        api,
        design
    } = global;
    const {
        url,
        key,
        models
    } = api.workers;

    const {
        threadID,
        senderID
    } = event;
    let query = args.join(" ");

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(font.monospace("Conversation history cleared."));
        return;
    }

    const modelNameArg = args[0]?.toLowerCase();
    let selectedModelName = modelNameArg;

    if (!models[selectedModelName] || models[selectedModelName].length === 0) {
        selectedModelName = "qwen";
        query = args.join(" ");
    } else {
        query = args.slice(1).join(" ");
    }

    if (args.length < 1) {
        const modelList = Object.keys(models).map((model, index) => `${index + 1}. ${model}`).join("\n");
        const exampleUsage = "Example: cf llama write me a story.";
        chat.reply(font.monospace(`Available models:\n${modelList}\n${exampleUsage}`));
        return;
    }

    if (!query) {
        chat.reply(font.monospace(`Please provide a question.`));
        return;
    }

    const answering = await chat.reply(font.monospace("🕐 | Answering..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query
    });

    const getRandomModel = () => {
        const randomIndex = Math.floor(Math.random() * models[selectedModelName].length);
        return models[selectedModelName][randomIndex];
    };

    const getResponse = async () => {
        const randomModel = getRandomModel();
        const modelID = randomModel.split('/').pop().toUpperCase();
        try {
            const response = await axios.post(url + randomModel, {
                messages: conversationHistories[senderID],
                max_tokens: 32000
            }, {
                headers: {
                    'Authorization': 'Bearer ' + atob(key),
                    'Content-Type': 'application/json',
                    'User-Agent': randomUseragent.getRandom()
                }
            });
            return response.data.result.response;
        } catch (error) {
            throw new Error(`Error from ${selectedModelName} AI: ${error.message}`);
        }
    };

    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease use other models get started with 'help'";

    while (attempts < maxRetries && !success) {
        try {
            answer = await getResponse();
            success = true;
        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(font.monospace(`No response from ${selectedModelName} AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(font.monospace(`No response from ${selectedModelName} AI. Please try again later: ${error.message}`));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({
            role: "assistant", content: answer
        });

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + design.line + "\n";

        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        const modelID = getRandomModel().split('/').pop().toUpperCase();
        const message = font.bold(` 🤖 | ${modelID}`) + line + answer + line + font.monospace(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

        await answering.edit(message);



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
            await chat.reply({
                attachment: fileStream
            });

            fs.unlinkSync(filePath);
        }
    }
};