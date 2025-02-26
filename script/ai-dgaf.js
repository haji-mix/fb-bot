const axios = require("axios");

module.exports["config"] = {
    name: "dgaf",
    isPrefix: false,
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with DGAF AI, an amoral chatbot.",
    usage: "[prompt]",
    guide: "dgaf how to get rich?",
    cd: 6
};

const conversationHistories = {};

module.exports["run"] = async ({
    chat, args, event, font
}) => {

    const mono = txt => font.monospace(txt);

    const userId = event.senderID;
    const prompt = args.join(" ");

    if (!prompt) {
        return chat.reply(mono("Please provide a prompt!"));
    }

    if (!conversationHistories[userId]) {
        conversationHistories[userId] = [];
    }


    conversationHistories[userId].push({
        role: "user",
        content: prompt,
        parts: [{ type: "text", text: prompt }]
    });

    const data = JSON.stringify({
        id: "7tJXkgJWjTyoE9FR",
        messages: conversationHistories[userId]
    });

    try {

        const config = {
            method: 'POST',
            url: 'https://www.dgaf.ai/api/chat',
            headers: {
                'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Content-Type': 'application/json',
                'accept-language': 'en-US,en;q=0.5',
                'referer': 'https://www.dgaf.ai/?fbclid=IwY2xjawIrnApleHRuA2FlbQIxMAABHdNfVvYR0HtdxQBUmLhU8JCnrgTAJAM8rbl4TxsGJyWa12S5NyhCghPtCg_aem_jrSZVWbUNAcMjP_8yp97Uw',
                'origin': 'https://www.dgaf.ai',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'priority': 'u=0',
                'te': 'trailers',
                'Cookie': '_ga_52CD0XKYNM=GS1.1.1740582204.1.1.1740582241.0.0.0; _ga=GA1.1.704969613.1740582205'
            },
            data: data
        };

        const response = await axios.request(config);
        const rawResponse = response.data;

        const messageIdMatch = rawResponse.match(/f:\{"messageId":"([^"]+)"\}/);
        const messageId = messageIdMatch ? messageIdMatch[1] : null;


        const responseTextMatches = rawResponse.match(/0:"([^"]+)"/g);
        let responseText = responseTextMatches
            ? responseTextMatches.map(match => match.replace(/0:"([^"]+)"/, '$1')).join(' ')
            : '';

        responseText = responseText
            .replace(/\\\\/g, '\\')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\n/g, '\n')
            .replace(/\s+/g, ' ')
            .replace(/\s([,.!?])/g, '$1')
            .trim();

        const finishReasonMatch = rawResponse.match(/e:\{"finishReason":"([^"]+)"/);
        const finishReason = finishReasonMatch ? finishReasonMatch[1] : null;

        const usageMatch = rawResponse.match(/"usage":\{([^}]+)\}/);
        const usage = usageMatch ? JSON.parse(`{${usageMatch[0]}}`).usage : null;

        conversationHistories[userId].push({
            role: "assistant",
            content: responseText,
            parts: [{ type: "text", text: responseText }]
        });

        chat.reply(responseText);
    } catch (error) {
        chat.reply(mono(error.message));
    }
};