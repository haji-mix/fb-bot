const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "evaljs",
    isPrefix: false,
    aliases: ["evaluate", "run", "exec", "execute", "evaljavascript", "eval"],
    usage: "[code] or reply to a message with code",
    info: "Evaluate and execute JavaScript code.",
    guide: "Use eval [code] to execute JavaScript code or reply to a message with code.",
    type: "admin",
    credits: "Kenneth Panio",
    version: "2.3.6",
    role: 3,
};

module.exports["run"] = async ({ api, event, args, chat, box, message, font, fonts, blacklist, prefix, admin, Utils, FontSystem, format, UNIRedux }) => {
    let code;

    if (event.type === "message_reply" && event.messageReply && (event.messageReply.attachments.length === 0 || /https?:\/\/[^\s]+/.test(event.messageReply.body))) {
        code = event.messageReply.body;
    } else {
        code = args.join(' ');
    }

    if (!code) {
        return chat.reply(font.monospace('Please provide the JavaScript code to evaluate.'));
    }

    const context = {
        console: {
            log: (...args) => chat.reply(font.monospace(`Log: ${args.join(' ')}`)),
            error: (...args) => chat.reply(font.monospace(`Error: ${args.join(' ')}`))
        }
    };

    try {
        const evalPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Evaluation timed out.')), 30000);
            (async () => {
                try {
                    const result = await eval(`(async () => { 
                        const console = arguments[0].console; 
                        try { 
                            ${code} 
                        } catch (error) { 
                            throw error; 
                        }
                    })()`)(context);
                    clearTimeout(timeout);
                    resolve(result);
                } catch (error) {
                    clearTimeout(timeout);
                    reject(error);
                }
            })();
        });

        const result = await evalPromise;

        if (result !== undefined) {
            const resultText = typeof result === 'object' ? JSON.stringify(result, null, 2) : result;
            return chat.reply(font.monospace(`Result: ${resultText}`));
        } else {
            return chat.reply(font.monospace('No result returned'));
        }
    } catch (error) {
        return chat.reply(font.monospace(error.stack || error.message));
    }
};