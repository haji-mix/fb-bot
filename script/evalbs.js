const {
    exec
} = require('child_process');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "evalbs",
    isPrefix: false,
    aliases: ["evalbash",
        "runbash",
        "execbash",
        "executebash"],
    usage: "[code] or reply to a message with code",
    info: "Evaluate and execute Bash commands.",
    guide: "Use evalbash [code] to execute Bash commands or reply to a message with code.",
    type: "Programming",
    credits: "Kenneth Panio",
    version: "1.0.0",
    role: 0,
};

module.exports["run"] = async ({
    event, args, chat, font
}) => {
    let code;
    if (event.type === "message_reply" && event.messageReply.body) {
        code = event.messageReply.body;
    } else {
        if (args.length === 0) {
            return chat.reply(font.monospace('Please provide the Bash command to evaluate.'));
        }
        code = args.join(' ');
    }

    try {
        const forbiddenPatterns = [
            /rm\s+/,
            /shutdown\s+/,
            /reboot\s+/,
            /mkfs\s+/,
            /dd\s+/,
            /chmod\s+/,
            /chown\s+/,
            /wget\s+/,
            /curl\s+/,
            /git\s+/,
            /eval\s*/,
            /cat\s*/,
            /nano\s*/,
            /--decode\s*/,
        ];

        for (const pattern of forbiddenPatterns) {
            const match = pattern.exec(code);
            if (match) {
                throw new Error(`Forbidden Bash code detected: ${match[0]}`);
            }
        }

        const options = {
            timeout: 10000
        }; // Timeout in milliseconds (10 seconds)

        exec(code, options, (error, stdout, stderr) => {
            if (error) {
                return chat.reply(font.monospace(`Error: ${error.message}`));
            }
            if (stderr) {
                return chat.reply(font.monospace(`Stderr: ${stderr}`));
            }

            const shouldSendAsAttachment = stdout.length > 1000;
            if (shouldSendAsAttachment) {
                const cacheFolderPath = path.join(__dirname, "cache");
                if (!fs.existsSync(cacheFolderPath)) {
                    fs.mkdirSync(cacheFolderPath);
                }
                const numeric = Math.floor(Math.random() * 10000);
                const filePath = path.join(cacheFolderPath, `EvalBash_Result_${event.senderID}_${numeric}.txt`);
                fs.writeFileSync(filePath, stdout, 'utf-8');
                const fileStream = fs.createReadStream(filePath);
                chat.reply({
                    body: code, attachment: fileStream
                });
                fileStream.on('close', () => fs.unlinkSync(filePath)); // Delete file after sending
            } else {
                chat.reply(font.monospace(`Result:\n${stdout}`));
            }
        });
    } catch (error) {
        chat.reply(font.monospace(`Error: ${error.message}`));
    }
};