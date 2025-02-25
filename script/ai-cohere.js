const axios = require("axios");

module.exports["config"] = {
    name: "cohere",
    aliases: ["coherel", "cohereapi"],
    info: "Cohere API integration",
    usage: "[prompt]",
    credits: "Kenneth Panio",
    version: "1.0.0",
    isPrefix: false,
    cd: 5,
};

module.exports["run"] = async ({ chat, args, font, event }) => {
    var mono = txt => font.monospace(txt);
    let prompt = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    prompt += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

    if (!prompt) {
        return chat.reply(mono("Please kindly provide your message!"));
    }

    const answering = await chat.reply(mono("Generating response..."));

    try {
        let message = prompt;

        let data = {
            message: message,
            model: "command-r-08-2024",
            temperature: 0.3,
            citationQuality: "CITATION_QUALITY_ACCURATE",
            conversationId: "e52b1636-6afb-4980-b137-060a31d09f6f"
        };

        let config = {
            method: 'POST',
            url: 'https://production.api.os.cohere.com/coral/v1/chat',
            headers: {
                'authority': 'production.api.os.cohere.com',
                'method': 'POST',
                'path': '/coral/v1/chat',
                'scheme': 'https',
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'authorization': 'Bearer ApUaG9059XRFVs3bwrH5SKuVH7QciWcuQrh5Wu1m',
                'cohere-version': '2022-12-06',
                'content-type': 'text/plain;charset=UTF-8',
                'origin': 'https://coral.cohere.com',
                'priority': 'u=1, i',
                'referer': 'https://coral.cohere.com/',
                'request-source': 'coral',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-site',
                'sec-gpc': '1',
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            },
            data: data
        };

        const response = await axios.request(config);
        const rawResponse = response.data;
        const cleanedResponse = cleanCohereResponse(rawResponse);
        answering.unsend();
        chat.reply(cleanedResponse.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text)));

    } catch (error) {
        answering.unsend();
        chat.reply(mono("Error calling Cohere API: " + error.message));
    }
};

/**
 * Cleans the raw response from the Cohere API by extracting and concatenating text from textGenerationStreamEvent.
 * @param {string} rawResponse - Raw response from the Cohere API.
 * @returns {string} - Cleaned and concatenated text.
 */
function cleanCohereResponse(rawResponse) {
    // Split the raw response into lines
    const lines = rawResponse.split('\n');
    let cleanedText = '';

    // Iterate through each line and parse the JSON object
    lines.forEach(line => {
        if (line.trim()) {
            try {
                const json = JSON.parse(line);
                // Check if the eventType is STREAM_EVENT_TYPE_TEXT_GENERATION
                if (json.result.eventType === 'STREAM_EVENT_TYPE_TEXT_GENERATION') {
                    cleanedText += json.result.textGenerationStreamEvent.text;
                }
            } catch (error) {
                console.error('Error parsing JSON line:', error);
            }
        }
    });

    return cleanedText;
}