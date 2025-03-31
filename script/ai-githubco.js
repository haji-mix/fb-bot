const axios = require("axios");

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

const GITHUB_API_HEADERS = (token) => ({
    "authorization": `GitHub-Bearer ${token}`,
    "copilot-integration-id": "copilot-chat",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
});

/**
 * Fetch GitHub Copilot token.
 * @returns {Promise<string>} The GitHub Copilot token.
 */
async function fetchToken(threadId) {
    const response = await axios.post("https://github.com/github-copilot/chat/token", {}, {
        headers: {
            'accept': 'application/json',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9',
            'content-type': 'application/json',
            'cookie': '_octo=GH1.1.763746902.1740227869; logged_in=yes; GHCC=Required:1-Analytics:1-SocialMedia:1-Advertising:1; _device_id=39b456c1b0923c455c2ba830bcb42402; saved_user_sessions=191758792%3Aq1zWbVWaLSBFpYKVlvzFIpS84LHY0H-Uc2Qi-z8TvTGlv0kJ; MicrosoftApplicationsTelemetryDeviceId=b5822961-d248-4256-91ac-ce31b5713106; MSFPC=GUID=9f68dd6cfdc24898bed1e87cb1ed6102&HASH=9f68&LV=202502&V=4&LU=1740230898455; user_session=q1zWbVWaLSBFpYKVlvzFIpS84LHY0H-Uc2Qi-z8TvTGlv0kJ; __Host-user_session_same_site=q1zWbVWaLSBFpYKVlvzFIpS84LHY0H-Uc2Qi-z8TvTGlv0kJ; dotcom_user=haji-mix; color_mode=%7B%22color_mode%22%3A%22auto%22%2C%22light_theme%22%3A%7B%22name%22%3A%22light%22%2C%22color_mode%22%3A%22light%22%7D%2C%22dark_theme%22%3A%7B%22name%22%3A%22dark%22%2C%22color_mode%22%3A%22dark%22%7D%7D; _gh_sess=s%2FHoyVuvncwRRPE82jTO79m3v%2F70LB50Q%2BblalxeX6HBkJt6tC6yVYI85q4AVXkC4%2BxWhcw7Z7ZPGVn2mjfDBVwk%2BoH2ZTMWDgUDfWffWxQNR4C%2BV%2FwMyLHv15xJeUwLgjYBBK4p5LuroBekNK50z7Nic8q1RAZA9quaPb%2FbJQvK3taQKzPHbFkRPDQGfSWBDI8%2BetbM%2BOCkOFT0FT92rL4D7O1AVbc8TKl%2FoEm79IzRrBpIWJJy9zaogGChLckA3T3t0ZbGk4fIObS1v9q%2BpDP3XYViHIbPinIb03X5a8PHHzzgrC0BZOvHu1QQXtZQCHLhJ6RilBTg7M%2BBcpFU38RubhcvDLjVYRM%2FVz6nSlCkOTjSuw4EwIFyVJSx5Sz86%2BXQsbwYg3sIt%2BYtNbRmTgIMYYAIaqFJSmSiUWcUaNv1oNqEjeudnCh6sjk7tiKJL0h%2FaQfXcjxULEefklqtHiHzc9StN0pcqLC%2B2JhbgrwKbH3qn1hxuoKi1TCtX3x2J1HmV2eQmhi4NxwijCWeO0uS%2FPMeEneWIq%2BB%2F2rKOkYLkqsZwxmZeGyf3WUck5m%2FDWurdzGBaQYW9ab7KSvPMEfqiIjIq9VG7S9tMsdnRaZySslY5tWjUnZN3XCx2aCJEiA8NhzB9M2L9oHvVc0K%2BnheNAndk3cgYL%2FtSF%2BBuuWwk8jXvS524JsMY%2BkSs6aSQ48g3YTVUVnQZFe9Hc6CalGxL3UnjeaITVrHHcwp%2FwLpK%2FEhhleaeCgDUrTHfhLpTdGNDiSemHDrunJCzBUd1w%3D%3D--Pzq3zIAvnvt4q5q%2F--im4Yu5nYiliT6NPZ7xPmHQ%3D%3D; cpu_bucket=md; preferred_color_mode=dark; tz=Asia%2FManila',
            'github-verified-fetch': 'true',
            'origin': 'https://github.com',
            'priority': 'u=1, i',
            'referer': `https://github.com/copilot/${threadId ? `c/${threadId}` : ''}`,
            'sec-ch-ua': '"Not(A:Brand";v="99", "Google Chrome";v="133", "Chromium";v="133"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            'x-requested-with': 'XMLHttpRequest'
        }
    });
    return response.data.token;
}

/**
 * Create a new conversation thread for a user.
 * @param {string} token - GitHub Copilot token.
 * @returns {Promise<string>} The new thread ID.
 */
async function createNewThread(token) {
    const response = await axios.post(
        "https://api.individual.githubcopilot.com/github/chat/threads",
        { custom_copilot_id: null },
        { headers: GITHUB_API_HEADERS(token) }
    );
    return response.data.thread_id;
}

/**
 * Delete a conversation thread.
 * @param {string} threadId - The thread ID to delete.
 * @param {string} token - GitHub Copilot token.
 * @returns {Promise<void>}
 */
async function deleteThread(threadId, token) {
    await axios.delete(`https://api.individual.githubcopilot.com/github/chat/threads/${threadId}`, {
        headers: GITHUB_API_HEADERS(token)
    });
}

module.exports["run"] = async ({ chat, args, font, event }) => {
    let query = args.join(" ");

    // Check if the user wants to reset the conversation
    const resetCommands = ["clear", "forget", "reset", "forgot"];
    if (resetCommands.includes(query.toLowerCase())) {
        const threadId = userThreadMap.get(event.senderID);
        if (threadId) {
            try {
                const token = await fetchToken(threadId);
                await deleteThread(threadId, token);
                userThreadMap.delete(event.senderID);
                chat.reply(font.bold("✅ | Conversation reset. A new thread will be created for your next message."));
            } catch (error) {
                chat.reply(font.monospace(`Error: ${error.message}`));
            }
        } else {
            chat.reply(font.bold("✅ | No active conversation to reset."));
        }
        return;
    }

    if (event.type === "message_reply" && event.messageReply.body) {
        query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
    }

    try {
        const token = await fetchToken();
        const modelsResponse = await axios.get("https://api.individual.githubcopilot.com/models", {
            headers: GITHUB_API_HEADERS(token)
        });

        const models = modelsResponse.data.data.filter(model => model.model_picker_enabled);
        if (!models || models.length === 0) {
            chat.reply(font.thin("No models available. Please check the API configuration."));
            return;
        }

        const defaultModel = models[0];
        const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

        if (isSwitchingModel) {
            const modelNumber = parseInt(args[1]) - 1;
            if (modelNumber < 0 || modelNumber >= models.length) {
                chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${models.length}.`));
                return;
            }

            userModelMap.set(event.senderID, modelNumber);
            chat.reply(font.bold(`✅ | Switched to model: ${models[modelNumber].name}`));
            return;
        }

        const selectedModelIndex = userModelMap.get(event.senderID) ?? 0;
        const selectedModel = models[selectedModelIndex];

        if (args.length === 0) {
            const modelList = models.map((model, index) => `${index + 1}. ${model.name}`).join('\n');
            chat.reply(
                font.bold("🤖 | Available Models:\n") +
                font.thin(modelList +
                    "\n\nTo switch models, use: copilot model [number]\nExample: copilot model 2\nTo chat use: copilot hello"
                ));
            return;
        }

        let threadId = userThreadMap.get(event.senderID);
        if (!threadId) {
            threadId = await createNewThread(token);
            userThreadMap.set(event.senderID, threadId);
        }
        
        let config = {
        method: 'GET',
        url: 'https://api.individual.githubcopilot.com/github/chat/system_prompt/immersive',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.5',
            'referer': 'https://github.com/',
            'authorization': `GitHub-Bearer ${token}`,
            'copilot-integration-id': 'copilot-chat',
            'origin': 'https://github.com',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'priority': 'u=4',
            'cache-control': 'max-age=0',
            'te': 'trailers'
        }
    };

    let systemPrompt = null;
    try {
        const systemPromptResponse = await axios.request(config);
        systemPrompt = systemPromptResponse.data.prompt;
    } catch (error) {
        return systemPrompt;
    }

        const answering = await chat.reply(font.monospace(`🕐 | ${selectedModel.name} is Typing...`));

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
                    systemPrompt,
                    "You're an Github Copilot code assistant an expert in frontend you're only allowed to make website in single html but you can't separate js or css you only mixed them together you can use any multiple frameworks to make the web responsive and more cleaner and cool design.",
                    "You're Also Allowed to Assist General Question or create code in different programming languages besides web development"
                ],
                model: selectedModel.id,
                mode: "immersive",
                customCopilotID: null,
                parentMessageID: threadId,
                tools: [],
                mediaContent: []
            },
            { headers: GITHUB_API_HEADERS(token) }
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

            const message = font.bold(" 🤖 | GITHUB COPILOT") + line + (completeMessage || "Github Copilot is under maintenance!") + line + font.thin(`Model: ` + selectedModel.id);
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