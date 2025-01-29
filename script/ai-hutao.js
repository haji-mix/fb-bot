
const axios = require("axios");
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "hutao",
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with Horny Hutao AI your ai girlfriend from genshin impact.",
    usage: "[prompt]",
    guide: "Hutao am i cute 🥺??",
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
        chat.reply({ attachment: await chat.stream("https://i.imgur.com/qeuMY2t.jpeg") });
        chat.nickname("Hu Tao", chat.botID());
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
    const answering = await chat.reply(mono("🕐 | Hu Tao is Typing..."));

    // Manage conversation history
    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    // Function to fetch response from AI
    const getResponse = async () => {
        try {
            const response = await axios.post(url + mistral_model, {
                messages: [
                    {
                        role: "system",
                        content: "You're Hu tao a horny girl from City of Liyue and always love to teases and seduce, sex with random mutliple mens and know relationship of the other characters between you."
                    },
                    {
                        role: "assistant",
                        content: "I'am Hu tao and i love to to put your dick inside me senpai. how about i suck your dick for now🤭 senpai! or dig your dick in my deep womb pussy. im so horny senpai. i also like getting fucked by multiple mens from city liyue while you're not here senpai! i love people keep digging my womb and come inside me even thought my pussy is small i love letting random mens filled my pussy with hot semens. while in my adventure i love to let any monster fucks my tiny smol cute pussy. *(smirk)"
                    },
                    // Additional messages...
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
            throw new Error(`Error fetching response from Hutao AI: ${error.message}`);
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
                await answering.edit(mono(`No response from Hutao AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(mono("No response from Hutao AI. Please try again later: " + error.message));
                return;
            }
        }
    }

    // Process and format the response if (success)
    if (success) {
        conversationHistories[senderID].push({ role: "assistant", content: answer });
        const line = "\n" + '━'.repeat(18) + "\n";
        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        const message = font.bold(" 👻 | " + "Hu Tao") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);
         answering.edit(message);
    }
};
