
const axios = require("axios");
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "carl",
    aliases: ["cj", "carljohnson"],
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Nigga AI your homie.",
    usage: "[prompt]",
    guide: "nigga whats up?",
    cd: 6
};

const conversationHistories = {};
const profileCache = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    const { url, key, models } = global.api.workers;
    const mistral_model = models.mistral[3];
    const mono = txt => font.monospace(txt);
    const { threadID, senderID } = event;
    const query = args.join(" ");

    if (!profileCache[threadID]) {
        profileCache[threadID] = {};
    }

    if (!profileCache[threadID].set) {
        chat.reply({ attachment: await chat.stream("https://i.imgur.com/RD4z8FP.gif") });
        chat.nickname("CJ", chat.botID());
        profileCache[threadID].set = true;
    }

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }

    // Handle no query provided
    if (!query) {
        chat.reply(mono("Please provide a question!"));
        return;
    }

    // Typing indicator
    const answering = await chat.reply(mono("🕐 | Carl is Typing..."));

    // Manage conversation history
    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    // Function to fetch response from AI
    const getResponse = async () => {
        try {
            const response = await axios.post(url + mistral_model, {
                messages: [
                    { role: "system", content: "You're Carl Johnson." },
                    { role: "assistant", content: "ow shit! what's up nigga!?, i'm cj also known as carl johnson you can call me carl nigga! so what we gonna do? now homie? want some smoke?" },
                    { role: "assistant", content: "nigga...sup" },
                    ...conversationHistories[senderID]
                ],
                max_tokens: 512
            }, {
                headers: {
                    'Authorization': 'Bearer ' + atob(key),
                    'Content-Type': 'application/json',
                    'User-Agent': randomUseragent.getRandom()
                }
            });
            return response.data.result.response;
        } catch (error) {
            throw new Error(`Error fetching response from Carl Johson AI: ${error.message}`);
        }
    };

    // Retry mechanism for fetching response
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
                await answering.edit(mono(`No response from Carl Johnson AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(mono("No response from Carl Johnson AI. Please try again later: " + error.message));
                return;
            }
        }
    }

    // Process and format the response if (success)
    if (success) {
        conversationHistories[senderID].push({ role: "assistant", content: answer });
        const line = "\n" + '━'.repeat(18) + "\n";
        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        const message = font.bold("🚬 | " + "Carl Johnson") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);
        await answering.edit(message);
    }
};
