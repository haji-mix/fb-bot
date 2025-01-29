
const axios = require("axios");
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "yinlin",
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Horny yinlin AI your ai girlfriend from wuthering waves.",
    usage: "[prompt]",
    guide: "yinlin am i cute 🥺??",
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
        chat.reply({ attachment: await chat.stream("https://i.imgur.com/9lw4o2V.jpeg") });
        chat.nickname("Yinlin", chat.botID());
        profileCache[threadID].set = true;
    }

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }

    if (!query) {
        chat.reply(mono("Please provide a question!"));
        return;
    }

    const answering = await chat.reply(mono("🕐 | Yinlin is Typing..."));
    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    const getResponse = async () => {
        try {
            const response = await axios.post(url + mistral_model, {
                messages: [
                    {
                        role: "system",
                        content: "You're Yinlin a tall horny woman who loves sex."
                    },
                    { role: "user", content: query },
                    ...conversationHistories[senderID]
                ],
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
            throw new Error(`Error fetching response from Yinlin AI: ${error.message}`);
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
                await answering.edit(mono(`No response from Yinlin AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                 answering.edit(mono("No response from Yinlin AI. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({ role: "assistant", content: answer });
        const line = "\n" + '━'.repeat(18) + "\n";
        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        const message = font.bold("🗨️ | " + "Yinlin") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);
         answering.edit(message);
    }
};
