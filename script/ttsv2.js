const fs = require('fs');
const path = require('path');
const axios = require('axios');

module.exports["config"] = {
    name: "tts",
    aliases: ["ttsv2", "text2speech", "t2s"],
    usage: "[text] or reply to a message containing text",
    info: "Convert text to speech using Kokoro API and reply with the audio.",
    guide: "Use 'ttsKokoro [text]' to convert text directly or reply to a message with 'ttsKokoro' to convert the message text.",
    type: "tools",
    credits: "Kenneth Panio",
    version: "1.0.0",
    role: 0,
};

module.exports["run"] = async ({ chat, event, args, font, global }) => {
    const text = event.type === "message_reply" ? font.origin(event.messageReply.body) : font.origin(args.join(' '));

    if (!text.trim()) {
        return chat.reply(font.monospace('Please provide the text to convert to speech or reply to a message containing the text.'));
    }

    try {
        const response = await axios.post("https://api.kokorotts.com/v1/audio/speech", {
            model: "kokoro",  // Not used but required for compatibility
            input: text,
            voice: "af_bella",
            response_format: "mp3",  // Supported: mp3, wav, opus, flac
            speed: 1.0
        }, { responseType: 'arraybuffer' });

        if (response.data) {
            const mp3Filename = `${Date.now()}.mp3`;
            const mp3Filepath = path.join(__dirname, 'cache', mp3Filename);

            // Ensure cache directory exists
            if (!fs.existsSync(path.dirname(mp3Filepath))) {
                fs.mkdirSync(path.dirname(mp3Filepath), { recursive: true });
            }

            // Save the MP3 file
            fs.writeFileSync(mp3Filepath, response.data);

            // Reply with the MP3 file
            await chat.reply({ attachment: fs.createReadStream(mp3Filepath) });

            // Optionally, clean up the file after sending
            fs.unlinkSync(mp3Filepath);
        } else {
            chat.reply(font.monospace('No audio data received from the API.'));
        }
    } catch (error) {
        chat.reply(font.monospace(`An error occurred while generating the speech: ${error.message}`));
    }
};
