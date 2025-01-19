const axios = require('axios');

module.exports["config"] = {
    name: "screenshot",
    isPrefix: false,
    aliases: ["screenshot", "capture"],
    usage: "[url]",
    info: "Capture a screenshot of the provided URL.",
    guide: "Use screenshot [url] to capture a screenshot of the URL or reply to a message with a URL.",
    type: "tools",
    credits: "Kenneth Panio",
    version: "1.0.0",
    role: 1,
};

module.exports["run"] = async ({ event, args, chat, font }) => {
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
        const screenshotUrl = `https://image.thum.io/get/width/1920/crop/400/fullpage/noanimate/${url}`;
        
        const attachment = await chat.stream(screenshotUrl);
        await chat.reply({ attachment });

    } catch (error) {
        chat.reply(`Error capturing screenshot: ${error.message}`);
    }
};
