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
  //      client_secret: 'I8oKnWWDv68Gr8Z5/Ftv25nK9Vy9CSEW+F0dmGvbamFxqwyaOeBdEOn/ZrQ3Bags',
        grant_type: 'refresh_token',
        refresh_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiI5ODY3MTgyMTgiLCJjaWQiOiJvZmEiLCJ2ZXIiOiIyIiwiaWF0IjoxNzM1NTQ0MzAzLCJqdGkiOiJiOGRoV0Z4TTc3MTczNTU0NDMwMyJ9.EAJrJflcetOzXUdCfQve306QTe_h3Zac76XxjS5Xg1c',
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
    //    responseType: 'stream',
    });
    
    return response.data.message;

  /*  return new Promise((resolve, reject) => {
        let result = '';
        response.data.on('data', chunk => {
            const match = chunk.toString().match(/"message":"(.*?)"/);
            if (match) {
                const message = match[1]
                .replace(/\\n/g, '\n')
                .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
                .replace(/\\([^\\\s]+)/g, '\n$1').replace(/\\+/g, '');
                result += message;
            }
        });

        response.data.on('end',
            () => {
                resolve(result.trim());
            });

        response.data.on('error',
            err => reject(err));
    });*/
}

module.exports.run = async ({
    chat, args, font, event
}) => {
    const mono = txt => font.monospace(txt);
    let prompt = args.join(" ");
    
    if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) return chat.reply(mono("This AI is a text-based model. Please use Gemini for more advanced capabilities."))
    
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
        chat.reply(formattedAnswer || "I'm sorry i can't answer stupid question!");
             
    } catch (error) {
        answering.unsend();
        chat.reply(mono("An error occurred: " + error.message));
    }
};

module.exports.handleEvent = async ({ chat, event, font }) => {

    const message = event?.body;

    if (message && (message.startsWith("@aria") || message.startsWith("@ai") || message.startsWith("@"))) {
        let prompt = message.replace(/@aria|@ai|@/g, "").trim();

        if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
            return chat.reply(font.monospace("This AI is a text-based model. Please use Gemini for more advanced capabilities."));
        }

        if (event.type === "message_reply" && event.messageReply.body) {
            prompt += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
        }

        if (!prompt) return chat.reply(font.monospace("Please kindly provide your message!"));

        const answering = await chat.reply(font.monospace("Generating response..."));

        try {
            const response = await queryOperaAPI(prompt);
            const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            answering.unsend();
            chat.reply(formattedAnswer || "I'm sorry, I can't answer that question!");
        } catch (error) {
            answering.unsend();
            console.error(error.message || error.stack);
        }
    }
};