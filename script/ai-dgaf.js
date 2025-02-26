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

module.exports["run"] = async ({ chat, args, font }) => {
    const mono = (txt) => font.monospace(txt);

    const prompt = args.join(" ");

    if (!prompt) {
        return chat.reply(mono("Please provide a prompt!"));
    }

    const data = JSON.stringify({
        id: "7tJXkgJWjTyoE9FR",
        messages: [
            {
                role: "user",
                content: prompt,
                parts: [{ type: "text", text: prompt }]
            }
        ]
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

        // Extract the response text and clean it up
        const responseTextMatches = rawResponse.match(/0:"([^"]+)"/g);
        let responseText = responseTextMatches
            ? responseTextMatches.map(match => match.replace(/0:"([^"]+)"/, '$1')).join(' ')
            : '';

        // Unescape characters and clean up formatting
        responseText = responseText
            .replace(/\\\\/g, '\\') // Replace \\ with \
            .replace(/\\\(/g, '(') // Replace \( with (
            .replace(/\\\)/g, ')') // Replace \) with )
            .replace(/\\n/g, '\n') // Replace \n with actual newlines
            .replace(/\s+/g, ' ') // Remove extra spaces
            .replace(/\s([,.!?])/g, '$1') // Fix spacing around punctuation
            .trim(); // Remove leading/trailing spaces

        // Send the cleaned-up response to the user
        chat.reply(responseText);
    } catch (error) {
        chat.reply(mono(error.message));
    }
};