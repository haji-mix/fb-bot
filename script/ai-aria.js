const axios = require('axios');
const crypto = require('crypto');
const randomUseragent = require('random-useragent');

module.exports.config = {
    name: "aria",
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
        if (error.response?.data?.detail === "user_limit") {
     answering.unsend();
    chat.reply(mono("This command is under maintenance! please use gemini or gpt4o for more info get started with 'help'."));
    return;
    }
        answering.unsend();
        chat.reply(mono(error.response?.data?.detail || error.message));
    }
};

module.exports.handleEvent = async ({ chat, event, font, Utils, prefix }) => {
    try {
        if (!event || !event.body) {
            return;
        }

        const message = event.body.trim();
        const triggerPrefixes = ["@aria", "@ai", "@meta"];
        const allCommands = [...Utils.commands.values()];

        const isCommand = allCommands.some((command) => {
            const { aliases = [], isPrefix = false } = command;

            if (aliases.length === 0) {
                return false;
            }

            return aliases.some((alias) => {
                const fullPrefix = isPrefix ? prefix + alias : alias;
                return message.toLowerCase().startsWith(fullPrefix.toLowerCase());
            });
        });

        if (isCommand) return;

        const isTriggered = triggerPrefixes.some((prefix) =>
            message.toLowerCase().startsWith(prefix.toLowerCase())
        );

        if ((event.isGroup && isTriggered) || !event.isGroup) {
            let prompt = event.isGroup
                ? message.slice(triggerPrefixes.find((prefix) => message.toLowerCase().startsWith(prefix.toLowerCase()))?.length).trim()
                : message;

            if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
                return chat.reply(font.monospace("This AI is a text-based model. Please use Gemini for more advanced capabilities."));
            }

            if (event.type === "message_reply" && event.messageReply.body) {
                prompt += `\n\nUser replied mentioning this message: ${event.messageReply.body}`;
            }

            if (!prompt) return;

            const response = await queryOperaAPI(prompt);
            const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            chat.reply(formattedAnswer || "I'm sorry, I can't answer that question!");
        }
    } catch (error) {
        console.error("Error in handleEvent:", error.message || error);

        if (error.response?.data?.detail === "user_limit") {
     //       chat.reply(font.monospace("This command is under maintenance! Please use Gemini or GPT-4 for more info. Get started with 'help'."));
        } else {
      //      chat.reply(font.monospace(error.response?.data?.detail || error.message));
        }
    }
};