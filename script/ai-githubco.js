const axios = require("axios");
const fs = require("fs");

// Store user-specific model selections and conversation threads
const userModelMap = new Map();
const userThreadMap = new Map();

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

/**
 * Create a new conversation thread for a user.
 * @returns {Promise<string>} The new thread ID.
 */
async function createNewThread(token) {
    try {
        const response = await axios.post(
            "https://api.individual.githubcopilot.com/github/chat/threads",
            { custom_copilot_id: null },
            {
                headers: {
                    "authorization": `GitHub-Bearer ${token}`,
                    "copilot-integration-id": "copilot-chat",
                    "content-type": "application/json",
                    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
                },
            }
        );
        return response.data.thread_id;
    } catch (error) {
        throw new Error(`Failed to create new thread: ${error.message}`);
    }
}

module.exports["run"] = async ({ chat, args, font, event }) => {
    let query = args.join(" ");

    // Check if the user wants to reset the conversation
    const resetCommands = ["clear", "forget", "reset"];
    if (resetCommands.includes(query.toLowerCase())) {
        userThreadMap.delete(event.senderID); // Delete the existing thread
        chat.reply(font.bold("✅ | Conversation reset. A new thread will be created for your next message."));
        return;
    }

    if (event.type === "message_reply" && event.messageReply.body) {
        query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
    }

    try {
        // Fetch GitHub Copilot token
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
                'Cookie': '_octo=GH1.1.763746902.1740227869; logged_in=yes; GHCC=Required:1-Analytics:1-SocialMedia:1-Advertising:1; _device_id=39b456c1b0923c455c2ba830bcb42402; saved_user_sessions=191758792%3A4rqcxsELKWG-11XDhX_tco2wp1kXcqceGRLrkrOjuH9yczse; user_session=4rqcxsELKWG-11XDhX_tco2wp1kXcqceGRLrkrOjuH9yczse; __Host-user_session_same_site=4rqcxsELKWG-11XDhX_tco2wp1kXcqceGRLrkrOjuH9yczse; dotcom_user=haji-mix; MicrosoftApplicationsTelemetryDeviceId=b5822961-d248-4256-91ac-ce31b5713106; MSFPC=GUID=9f68dd6cfdc24898bed1e87cb1ed6102&HASH=9f68&LV=202502&V=4&LU=1740230898455; color_mode=%7B%22color_mode%22%3A%22auto%22%2C%22light_theme%22%3A%7B%22name%22%3A%22light%22%2C%22color_mode%22%3A%22light%22%7D%2C%22dark_theme%22%3A%7B%22name%22%3A%22dark%22%2C%22color_mode%22%3A%22dark%22%7D%7D; _gh_sess=AZti3wukfx1mrAhA%2FKORV12jFRmXSk20mhxhtngKXYrrYZuWC%2FramnoJTZMR9AnK3%2Bg304xH7F7R451uZDhDhB%2BX51TaAaclZ2VqZLQhzO%2FKEvpoDUqWXT3Trv1oXDOnXlOyIGoAEG%2FsJS96Fi23OBjDagWtpLEjkt%2BdI%2B%2B2F42bZR6ci8rzdOiB7IWSyWDXgxevdbUYzKE%2FzThQLLYOsXbNFDpGHvra3yq9Mrnn82h%2BGEVG9P4q8jFF0cUGq0u9ExVOAMH5bczo%2F7fXSSObGMdzX8ckP4McERz9d0xs6P3Sy3FpK5rqQ5ikGUYWHlfjoFTBH87P1iZuipejo1uZeGa4OwoeXtI7qilLLdxJFFAcfpWTIAkqjebJv%2Fz%2FEhUF0ljjmHggCoKzVOtuO%2FVZqaOuOuplT5FfvDFy4Xonb91ssZPc8nIi%2BrAldCk3nJuukqIvvfQWV05AFILXfk6jFqTVX%2FVgBdKoERVJSH38DhsHf%2BN%2FyP%2F7tvatenfw9z8ZPtB6%2B3EGmI%2B0trgeDNW%2BVqSe79WJ4Og3t3wPZMpoixs0mt%2Bl67bVtCVmgkPbYZ0zvend25xrtY2TD3Ns5iuMoccrXxrEH9BcUiuduEXn7ulChU9jDuUUUtb9cJtb2PzSEMLmDfD6XQPkh%2FY%2B7Dcb5wWmMKthrkrccjxeP1kuqmDdAABgHgO3mZFoi9UCQADspvKngtSO2UNcDH8HyWYQ5cGe7bjp4c9oQo3UwzkHvU%2BPbpEgCaGLyVoCtlK4ydv9Eb%2B0So4cntIM0HeOY3qwMQ%3D%3D--QY0PT1jcIrVakzld--SN%2FdYchv8tyWx8MhH8Zoag%3D%3D; cpu_bucket=md; preferred_color_mode=dark; tz=Asia%2FManila'
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
                'authorization': `GitHub-Bearer ${token}`,
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
                font.thin(modelList +
                    "\n\nTo switch models, use: copilot model [number]\nExample: copilot model 2\nTo chat use: copilot hello"
                ));
            return;
        }

        // Get or create a thread ID for the user
        let threadId = userThreadMap.get(event.senderID);
        if (!threadId) {
            threadId = await createNewThread(token);
            userThreadMap.set(event.senderID, threadId);
        }

        const answering = await chat.reply(font.monospace(`🕐 | ${selectedModel.name} is Typing...`));

        // Sending Chat Request with the fresh token and thread ID
        const chatResponse = await axios.post(
            `https://api.individual.githubcopilot.com/github/chat/threads/${threadId}/messages`,
            {
                content: query,
                intent: "conversation",
                references: [],
                context: [],
                currentURL: "https://github.com/copilot",
                streaming: true,
                confirmations: [],
                customInstructions: [
                    "You're an Github Copilot code assistant an expert in frontend you're only allowed to make website in single html but you can't separate js or css you only mixed them together you can use any multiple frameworks to make the web responsive and more cleaner and cool design.",
                    "You're Also Allowed to Assist General Question or create code in different programming languages besides web development"
                ],
                model: selectedModel.id, // Use the selected model
                mode: "immersive",
                customCopilotID: null,
                parentMessageID: "",
                tools: [],
                mediaContent: []
            },
            {
                headers: {
                    "authorization": `GitHub-Bearer ${token}`,
                    "copilot-integration-id": "copilot-chat",
                    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
                    "content-type": "application/json",
                    "accept": "*/*",
                    "origin": "https://github.com",
                    "sec-fetch-site": "cross-site",
                    "sec-fetch-mode": "cors",
                    "sec-fetch-dest": "empty",
                    "referer": "https://github.com/"
                }
            }
        );

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

            const message = font.bold(" 🤖 | GITHUB COPILOT") + line + completeMessage + line + font.thin(`Model: ` + selectedModel.id);
            answering.edit(message);

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
        } else {
            answering.edit(font.monospace(`Request failed with status code ${chatResponse.status}`));
        }
    } catch (error) {
        chat.reply(font.monospace(`Error: ${error.message}`));
    }
};