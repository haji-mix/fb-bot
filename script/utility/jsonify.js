const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
        name: "jsonify",
        isPrefix: false,
        aliases: ["jsonify", "formatjson", "beautifyjson"],
        usage: "[json] or reply to a message with JSON",
        info: "Beautify and format JSON strings.",
        guide: "Use jsonify [json] to format JSON or reply to a message with JSON.",
        type: "utility",
        credits: "Kenneth Panio",
        version: "1.0.0",
        role: 0,
};

module.exports["run"] = async ({ event, args, chat, font }) => {
        let jsonInput;
        if (event.type === "message_reply" && event.messageReply.body) {
                jsonInput = event.messageReply.body;
        } else {
                if (args.length === 0) {
                        return chat.reply(font.monospace('Please provide a JSON string to format.'));
                }
                jsonInput = args.join(' ');
        }

        try {
   
                const parsedJson = JSON.parse(jsonInput);
                const beautifiedJson = JSON.stringify(parsedJson, null, 4);

                const shouldSendAsAttachment = beautifiedJson.length > 1000;
                if (shouldSendAsAttachment) {
                        const cacheFolderPath = path.join(__dirname, "cache");
                        if (!fs.existsSync(cacheFolderPath)) {
                                fs.mkdirSync(cacheFolderPath);
                        }
                        const numeric = Math.floor(Math.random() * 10000);
                        const filePath = path.join(cacheFolderPath, `Beautified_JSON_${event.senderID}_${numeric}.json`);
                        fs.writeFileSync(filePath, beautifiedJson, 'utf-8');
                        const fileStream = fs.createReadStream(filePath);
                        chat.reply({ body: 'Here is your beautified JSON:', attachment: fileStream });
                        fileStream.on('close', () => fs.unlinkSync(filePath)); 
                } else {
                        chat.reply(beautifiedJson);
                }
        } catch (error) {
                chat.reply(font.monospace(error.stack || error.message || 'Error beautifying JSON.'));
        }
};