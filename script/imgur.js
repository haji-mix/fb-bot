
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "imgur",
    version: "2.1.0",
    role: 0,
    isPrefix: false,
    credits: "Kenneth Panio",
    info: "Upload picture, GIF, or video to imgur",
    type: "tools",
    usage: "[reply to media]",
    guide: "reply to the media with 'imgur'",
    cd: 5,
};

module.exports["run"] = async ({ chat, event }) => {
    try {
        if (!event.messageReply || !event.messageReply.attachments || event.messageReply.attachments.length === 0) {
            return chat.reply('Please reply to an image, video, or GIF.');
        }

        const attachments = event.messageReply.attachments;
        const cacheDir = './cache';
        const imgurLinks = [];

        // Ensure cache directory exists
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir);
        }

        for (let i = 0; i < attachments.length; i++) {
            const mediaUrl = attachments[i].url;
            const mediaFileName = `${Date.now()}_${Math.floor(Math.random() * 100000)}_${i}.${mediaUrl.split('.').pop()}`;
            const mediaPath = path.join(cacheDir, mediaFileName);

            // Download the media file if it doesn't exist in cache
            if (!fs.existsSync(mediaPath)) {
                const response = await axios.get(mediaUrl, { responseType: 'stream' });
                const writer = fs.createWriteStream(mediaPath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            }

            // Upload to Imgur
            const formData = new FormData();
            formData.append('image', fs.createReadStream(mediaPath));

            const imgurResponse = await axios.post('https://api.imgur.com/3/image', formData, {
                headers: {
                    Authorization: "Client-ID 2ff23001e4259ff",
                    ...formData.getHeaders(),
                },
            });

            const imgurData = imgurResponse.data.data;
            if (imgurData.error) {
                return chat.reply(imgurData.error);
            }

            const imgurLink = imgurData.link || 'Failed To Upload!';
            imgurLinks.push(`${i + 1}: ${imgurLink}`);
        }

        chat.reply(imgurLinks.join('\n'));
    } catch (error) {
        if (error.response && error.response.status === 400) {
            return chat.reply("Unsupported Attachment Upload Aborted!");
        }
        chat.reply(error.message);
    }
};
