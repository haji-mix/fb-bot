const axios = require('axios');
const crypto = require('crypto');
const randomUseragent = require('random-useragent');

module.exports.config = {
    name: "aria",
    aliases: ["ai"],
    info: "Aria AI",
    usage: "[prompt]",
    credits: "Kenneth Panio",
    version: "1.0.0",
    isPrefix: false,
    cd: 5,
};

async function getAccessToken() {
    const data = new URLSearchParams({
        client_id: 'ofa',
        grant_type: 'refresh_token',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI5ODY2NDQzMDciLCJjaWQiOiJvZmEiLCJ2ZXIiOiIyIiwiaWF0IjoxNzM1NDYzMjgzLCJqdGkiOiI4dHdOSFhleEJSMTczNTQ2MzI4MyJ9.UWlp9m4iDwU3fBQ7KuTyMZ02vUmc56LyiqbUaDXJuRw',
        scope: 'shodan:aria user:read',
    });

    const response = await axios.post('https://oauth2.opera-api.com/oauth2/v1/token/', data, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': randomUseragent.getRandom(ua => ua.browserName === 'Opera'),
        },
    });

    return response.data.access_token;
}

async function queryOperaAPI(query) {
    const token = await getAccessToken();
    const key = crypto.randomBytes(32).toString('base64');

    const payload = {
        query,
        convertational_id: Date.now(),
        stream: false,
        linkify: true,
        linkify_version: 3,
        sia: true,
        supported_commands: [],
        media_attachments: [],
        encryption: {
            key
        },
    };

    const response = await axios.post('https://composer.opera-api.com/api/v1/a-chat', payload, {
        headers: {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': `Bearer ${token}`,
            'User-Agent': randomUseragent.getRandom(ua => ua.browserName === 'Opera'),
            'x-opera-ui-language': 'en',
            'accept-language': 'en-US',
            'sec-ch-ua': '"OperaMobile";v="86", ";Not A Brand";v="99", "Opera";v="115", "Chromium";v="130"',
            'sec-ch-ua-mobile': '?1',
            'x-opera-timezone': '+08:00',
            origin: 'opera-aria://ui',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            priority: 'u=1, i',
        },
    });

    return response.data.message;
}

module.exports.run = async ({ chat, args, font, event }) => {
    const mono = txt => font.monospace(txt);
    let prompt = args.join(" ");

    if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
        return chat.reply(mono("This AI is a text-based model. Please use Gemini for more advanced capabilities."));
    }

    if (event.type === "message_reply" && event.messageReply.body) {
        prompt += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
    }

    if (!prompt) {
        return chat.reply(mono("Please kindly provide your message!"));
    }

    const answering = await chat.reply(mono("Generating response..."));

    try {
        const response = await queryOperaAPI(prompt);
        const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
        answering.unsend();
        chat.reply(formattedAnswer || "I'm sorry, I can't answer that question!");
    } catch (error) {
        answering.unsend();
        chat.reply(mono(error.response?.data?.detail || error.message));
    }
};

module.exports.handleEvent = async ({ chat, event, font, Utils }) => {
    const message = event?.body;
    const triggerRegex = /^(@aria|@ai|@meta)/i;
    const allCommands = [...Utils.commands.values()];

    // Function to escape special regex characters
    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if the message matches any command alias (excluding name)
    const isCommand = allCommands.some(command => {
        const { aliases = [] } = command;

        // Skip commands with no aliases
        if (aliases.length === 0) {
            return false;
        }

        // Escape special characters in aliases
        const escapedAliases = aliases.map(alias => escapeRegex(alias));

        // Create regex pattern using only aliases
        const commandRegex = new RegExp(`^(${escapedAliases.join('|')})`, 'i');
        return message && commandRegex.test(message);
    });

    // If the message is a command, do not proceed further
    if (isCommand) {
        return;
    }

    if ((event.isGroup && message && triggerRegex.test(message)) || !event.isGroup) {
        let prompt = event.isGroup ? message.replace(triggerRegex, "").trim() : message;

        if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
            return chat.reply(font.monospace("This AI is a text-based model. Please use Gemini for more advanced capabilities."));
        }

        if (event.type === "message_reply" && event.messageReply.body) {
            prompt += `\n\nUser replied mentioning this message: ${event.messageReply.body}`;
        }

        if (!prompt) {
            return chat.reply(font.monospace("Please kindly provide your message!"));
        }

        try {
            const response = await queryOperaAPI(prompt);
            const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            chat.reply(formattedAnswer || "I'm sorry, I can't answer that question!");
        } catch (error) {
            console.error(error.response?.data?.detail || error.message);
        }
    }
};