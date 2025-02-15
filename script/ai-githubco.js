const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Store user-specific model selections
const userModelMap = new Map();

module.exports["config"] = {
    name: "copilot",
    isPrefix: false,
    aliases: ["copilot-chat", "github-copilot", "ghc", "gcop", "cop", "co"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with GitHub Copilot Chat AI coding assistant. Switch models using 'copilot model [number]'.",
    usage: "[model] [number]/[prompt]",
    guide: "copilot [model number]/[prompt]\nExample: copilot model 1 Example2: Write a simple REST API in Node.js",
    cd: 6,
};

module.exports["run"] = async ({ chat, args, font, event }) => {
    const query = args.join(" ");

    try {
        const tokenResponse = await axios.post("https://github.com/github-copilot/chat/token", {}, {
            headers: {
                'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
                'sec-ch-ua-mobile': '?1',
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'content-type': 'application/json',
                'accept': 'application/json',
                'x-requested-with': 'XMLHttpRequest',
                'github-verified-fetch': 'true',
                'sec-ch-ua-platform': '"Android"',
                'origin': 'https://github.com',
                'sec-fetch-site': 'same-origin',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://github.com/copilot',
                'accept-language': 'en-US,en;q=0.9',
                'cookie': '_octo=GH1.1.1126303553.1735553986; _device_id=1e2414f73f81229b737b92251e7ddb0c; saved_user_sessions=152267140%3AkEByvUOa2PyeMqXwXMG0zqreQxAjhYq7FM2Emmk3pbYD6baD%7C191758792%3A6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; user_session=6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; __Host-user_session_same_site=6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; logged_in=yes; dotcom_user=haji-mix; color_mode=%7B%22color_mode%22%3A%22auto%22%2C%22light_theme%22%3A%7B%22name%22%3A%22light%22%2C%22color_mode%22%3A%22light%22%7D%2C%22dark_theme%22%3A%7B%22name%22%3A%22dark%22%2C%22color_mode%22%3A%22dark%22%7D%7D; cpu_bucket=lg; preferred_color_mode=dark; tz=Asia%2FManila; _gh_sess=58hwKZze2uyKpibEOGA43wFRI1XyooQ3bWQSeJt3HpP%2BG%2FbXu%2BqfhGDHPlTZTHjIfda1iPXXRZGPUilowDi%2BDKPoD2OCTEqz%2FMiXgXLmz1b5ybqQCYSmtQNXoFG2D188puQ6olKwAVnbdTHwMjhdKfKjumcrEbM2OKYknQTAnw1oVWGc9Ztu%2Bbaf5Q%2Ff4mgVrugVk3lJb5VsvwmoYaDauRERIRxgeeFbA8PDjYNmldlvM9x9gPeoMcNH9tq5XQtFUCafFOohv4QS%2BjzmKzDxjWJHB4gkF9sB%2FLhpRYI8q5D3w3hszcFfkNIGRm8K3IHulf8H0Q%3D%3D--OwW62Ih0MPSXaE8u--yDHGLg7xBS8ZjreAoZD%2BHQ%3D%3D'
            }
        });

        const token = tokenResponse.data.token;
        if (!token) throw new Error("Failed to retrieve GitHub Copilot token.");

        // Fetch available models (only those with `model_picker_enabled: true`)
        const modelsResponse = await axios.get("https://api.individual.githubcopilot.com/models", {
            headers: {
                'cache-control': 'max-age=0',
                'copilot-integration-id': 'copilot-chat',
                'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
                'sec-ch-ua-mobile': '?1',
                'authorization': `GitHub-Bearer ${token}`, // Use the fetched token here
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
                'sec-ch-ua-platform': '"Android"',
                'accept': '*/*',
                'origin': 'https://github.com',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://github.com/',
                'accept-language': 'en-US,en;q=0.9',
            },
        });

        const models = modelsResponse.data.data.filter(model => model.model_picker_enabled);

        if (!models || models.length === 0) {
            chat.reply(font.thin("No models available. Please check the API configuration."));
            return;
        }

        // Default model (first model in the list)
        const defaultModel = models[0];

        // Check if the user is trying to switch models
        const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

        if (isSwitchingModel) {
            const modelNumber = parseInt(args[1]) - 1; // Convert to zero-based index
            if (modelNumber < 0 || modelNumber >= models.length) {
                chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${models.length}.`));
                return;
            }

            // Save the selected model for the user
            userModelMap.set(event.senderID, modelNumber);
            const modelName = models[modelNumber].name;
            chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
            return;
        }

        // Get the selected model for the user (or use the default model)
        const selectedModelIndex = userModelMap.get(event.senderID) ?? 0;
        const selectedModel = models[selectedModelIndex];

        // If no query is provided, show instructions on how to switch models
        if (args.length === 0) {
            const modelList = models.map((model, index) => `${index + 1}. ${model.name}`).join('\n');
            chat.reply(
                font.bold("🤖 | Available Models:\n") +
                modelList +
                "\n\nTo switch models, use: copilot model [number]\nExample: copilot model 2\nTo chat use: copilot hello"
            );
            return;
        }

        const answering = await chat.reply(font.monospace(`🕐 | ${selectedModel.name} is Typing...`));

        // Sending Chat Request with the fresh token
        const chatResponse = await axios.post("https://api.individual.githubcopilot.com/github/chat/threads/4e5b591e-3c89-43d6-b053-c57289778b68/messages?", {
            content: query,
            intent: "conversation",
            references: [],
            context: [],
            currentURL: "https://github.com/copilot",
            streaming: true,
            confirmations: [],
            customInstructions: [],
            model: selectedModel.id, // Use the selected model
            mode: "immersive",
            customCopilotID: null,
            parentMessageID: "",
            tools: [],
            mediaContent: []
        }, {
            headers: {
                "authorization": `GitHub-Bearer ${token}`, // Use the fetched token here
                "copilot-integration-id": "copilot-chat",
                "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
                "content-type": "text/event-stream",
                "accept": "*/*",
                "origin": "https://github.com",
                "sec-fetch-site": "cross-site",
                "sec-fetch-mode": "cors",
                "sec-fetch-dest": "empty",
                "referer": "https://github.com/"
            }
        });

        if (chatResponse.status === 200) {
            let completeMessage = "";
            const dataLines = chatResponse.data.split("\n");

            dataLines.forEach(line => {
                if (line.startsWith("data:")) {
                    try {
                        const json = JSON.parse(line.substring(6));
                        if (json.type === "content") {
                            completeMessage += json.body;
                        }
                    } catch (error) {
                        console.error("Error parsing JSON:", error.message);
                    }
                }
            });

            const codeBlocks = completeMessage.match(/```[\s\S]*?```/g) || [];
            const line = "\n" + "━".repeat(18) + "\n";
            completeMessage = completeMessage.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

            const message = font.bold(" 🤖 | GitHub Copilot") + line + completeMessage + line + font.thin(`\nModel: ` + selectedModel.id);
            await answering.edit(message);

            // Handle Code Snippets
            if (codeBlocks.length > 0) {
                const allCode = codeBlocks.map(block => block.replace(/```/g, "").trim()).join("\n\n\n");
                const cacheFolderPath = path.join(__dirname, "cache");

                if (!fs.existsSync(cacheFolderPath)) fs.mkdirSync(cacheFolderPath);

                const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
                const filePath = path.join(cacheFolderPath, uniqueFileName);

                fs.writeFileSync(filePath, allCode, "utf8");

                const fileStream = fs.createReadStream(filePath);
                await chat.reply({
                    attachment: fileStream
                });

                fs.unlinkSync(filePath);
            }
        } else {
            await answering.edit(font.monospace(`Request failed with status code ${chatResponse.status}`));
        }
    } catch (error) {
        await answering.edit(font.monospace(`Error: ${error.message}`));
    }
};