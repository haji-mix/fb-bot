const axios = require('axios');

module.exports["config"] = {
    name: "catboxmoe",
    aliases: ["catbox", "cbm"],
    version: "2.1.0",
    role: 0,
    isPrefix: false,
    credits: "Kenneth Panio",
    info: "Upload picture, GIF, or video to Catbox.moe",
    type: "tools",
    usage: "[reply to media]",
    guide: "Reply to a media file with this command",
    cd: 5,
};

module.exports["run"] = async ({ chat, event }) => {
    try {
        if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {

            return chat.reply('Please reply to an image, video, or GIF.');
        }

        const attachments = event.messageReply.attachments;
        let CatboxLinks = [];

        for (let i = 0; i < attachments.length; i++) {
            const mediaUrl = encodeURIComponent(attachments[i].url);

            const response = await axios.post(
                'https://catbox.moe/user/api.php',
                new URLSearchParams({
                    reqtype: "urlupload",
                    url: mediaUrl,
                    userhash: ""
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                    },
                }
            );

            if (!response.data || response.data.includes("ERROR")) {
                CatboxLinks.push(`${i + 1}: Failed to upload!`);
            } else {
                CatboxLinks.push(`${i + 1}: ${response.data}`);
            }
        }

        chat.reply(CatboxLinks.join('\n'));
    } catch (error) {
        chat.reply(`Upload failed: ${error.message}`);
    }
};
