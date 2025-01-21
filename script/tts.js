const fs = require('fs');
const path = require('path');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');

module.exports["config"] = {
        name: "ttslite",
        usage: "[text] or reply to a message containing text",
        info: "Convert text to speech and reply with the audio.",
        guide: "Use 'tts [text]' to convert text directly or reply to a message with 'tts' to convert the message text.",
        type: "utility",
        credits: "Kenneth Panio",
        version: "1.0.0",
        role: 0,
};

module.exports["run"] = async ({ chat, event, args, font, global }) => {
        const { url, tts } = global.api.workers.aiproxy;

        // Ensure cache directory exists
        const cacheDir = path.join(__dirname, 'cache');
        if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir);
        }

        const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.25 Mobile Safari/537.36',
                'Referer': 'https://netwrck.com/ai-chat/-Dragon%20Ball%20AY-'
        };

        let text = '';

        if (event.type === "message_reply") {
                text = font.origin(event.messageReply.body);
        } else {
                text = font.origin(args.join(' '));
        }

        if (!text.trim()) {
                return chat.reply(font.monospace('Please provide the text to convert to speech or reply to a message containing the text.'));
        }

        const data = {
                "speaker": tts[0],
                "prompt": text
        };

        try {
                const response = await axios.post(url, data, { headers, responseType: "arraybuffer" });

                if (response.data) {
                        const oggFilename = `${Date.now()}.ogg`; // Unique filename based on timestamp
                        const oggFilepath = path.join(cacheDir, oggFilename);
                        const mp3Filename = `${Date.now()}.mp3`; // MP3 filename
                        const mp3Filepath = path.join(cacheDir, mp3Filename);

                        // Save the Ogg file
                        fs.writeFileSync(oggFilepath, response.data);

                        // Convert the Ogg file to MP3
                        ffmpeg(oggFilepath)
                                .toFormat('mp3')
                                .on('end', async () => {
                                        // Reply with the MP3 file
                                        await chat.reply({ attachment: fs.createReadStream(mp3Filepath) });

                                        // Clean up Ogg and MP3 files if needed
                                        fs.unlinkSync(oggFilepath);
                                        fs.unlinkSync(mp3Filepath);
                                })
                                .on('error', (err) => {
                                        console.error('Error converting audio:', err);
                                        chat.reply(font.monospace('An error occurred during the audio conversion.'));
                                })
                                .save(mp3Filepath);
                } else {
                        chat.reply(font.monospace('No audio data received from the API.'));
                }
        } catch (error) {
                chat.reply(font.monospace(`An error occurred while generating the speech: ${error.message}`));
        }
};