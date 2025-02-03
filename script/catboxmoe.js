const axios = require('axios');
const FormData = require('form-data');

module.exports["config"] = {
    name: "catboxmoe",
    aliases: ["catbox",
        "cbm"],
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

module.exports["run"] = async ({
    chat, event
}) => {
    try {
        if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
            return chat.reply('Please reply to an image, video, or GIF.');
        }

        const attachments = event.messageReply.attachments;
        let CatboxLinks = [];

        for (let i = 0; i < attachments.length; i++) {
            const mediaUrl = attachments[i].url;

            const formData = new FormData();
            formData.append("reqtype", "urlupload");
            formData.append("url", mediaUrl);
            formData.append("userhash", "");

            const response = await axios.post(
                'https://catbox.moe/user/api.php',
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
                        'Accept': 'application/json',
                        'Accept-Encoding': 'gzip, deflate, br, zstd',
                        'sec-ch-ua-platform': '"Android"',
                        'cache-control': 'no-cache',
                        'sec-ch-ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
                        'sec-ch-ua-mobile': '?1',
                        'x-requested-with': 'XMLHttpRequest',
                        'dnt': '1',
                        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundaryGjKILgoCl97SMtjB',
                        'origin': 'https://catbox.moe',
                        'sec-fetch-site': 'same-origin',
                        'sec-fetch-mode': 'cors',
                        'sec-fetch-dest': 'empty',
                        'referer': 'https://catbox.moe/',
                        'accept-language': 'en-US,en;q=0.9,id;q=0.8,fil;q=0.7',
                        'priority': 'u=1, i',
                        'Cookie': 'PHPSESSID=lh4pvrooh9auk93nts65bqadtk',
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