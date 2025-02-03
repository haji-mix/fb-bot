const axios = require('axios');
const qs = require('qs');

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
            const mediaUrl = attachments[i].url;

            const data = qs.stringify({
                reqtype: 'urlupload',
                userhash: '',
                url: mediaUrl
            });

            const response = await axios.post(
                'https://catbox.moe/user/api.php',
                data,
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'Referer': 'https://catbox.moe/'
                    }
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
