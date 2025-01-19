const axios = require('axios');

module.exports["config"] = {
    name: "screenshot",
    isPrefix: false,
    aliases: ["screenshot", "capture"],
    usage: "[url]",
    info: "Capture a screenshot of the provided URL.",
    guide: "Use screenshot [url] to capture a screenshot of the URL or reply to a message with a URL.",
    type: "Utility",
    credits: "Kenneth Panio",
    version: "1.0.0",
    role: 0,
};

module.exports["run"] = async ({ event, args, chat, font, global }) => {
    let url;

    if (event.type === "message_reply" && event.messageReply.body) {
        url = event.messageReply.body;
    } else {
        if (!args || args.length === 0) {
            return chat.reply('Please provide a URL to capture.');
        }
        url = args.join(' ');
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return chat.reply('Invalid URL format. Please provide a valid URL starting with http:// or https://.');
    }

    try {
        const encodedUrl = encodeURIComponent(url);

        const screenshotUrl = `https://image.thum.io/get/width/1920/crop/400/fullpage/noanimate/${encodedUrl}`;
        
        const attachment = await chat.arraybuffer(screenshotUrl);

        const nsfwResponse = await axios.get(global.api.kokoro[0] + "/google", {
            params: {
                prompt: "detect",
                model: "gemini-1.5-flash",
                uid: Date.now(),
                roleplay: "As a dedicated NSFW detector, please respond exclusively with a JSON object { \"nsfw\": boolean, \"reason\": \"string\" } indicating whether the content is classified as NSFW (true or false). Additionally, provide clear information within the JSON under the key 'reason,' detailing the specific elements or characteristics that led to this classification.",
                file_url: screenshotUrl,
            }
        });

        const output = nsfwResponse.data.message.replace(/```json|```/g, '').trim();
        const nsfwData = JSON.parse(output);
        
        if (nsfwData.nsfw) {
            return chat.reply(font.monospace(`Inappropriate content detected: ${nsfwData.reason}`));
        }

        await chat.reply({ attachment });

    } catch (error) {
        chat.reply(`Error capturing screenshot: ${error.message}`);
    }
};
