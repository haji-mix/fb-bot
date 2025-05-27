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

    const createContext = (chat, font) => {
        return {
            console: {
                log: (...args) => chat.reply(font.monospace(`Log: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`)),
                error: (...args) => chat.reply(font.monospace(`Error: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`)),
                warn: (...args) => chat.reply(font.monospace(`Warning: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`)),
                info: (...args) => chat.reply(font.monospace(`Info: ${args.map(arg => typeof arg === 'object' ? JSON.stringify(arg, null, 2) : arg).join(' ')}`))
            },
            require: require,
            process: process,
            module: module,
            exports: exports,
            __filename: __filename,
            __dirname: __dirname
        };
    };

    const context = createContext(chat, font);

    try {
        const evalPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Evaluation timed out after 30 seconds.')), 30000);
            
            try {
                const func = new Function('context', `
                    with(context) {
                        try {
                            return (async () => {
                                ${code}
                            })();
                        } catch(err) {
                            throw err;
                        }
                    }
                `);
                
                const resultPromise = Promise.resolve(func(context));
                
                resultPromise.then(result => {
                    clearTimeout(timeout);
                    resolve(result);
                }).catch(err => {
                    clearTimeout(timeout);
                    reject(err);
                });
                
            } catch (err) {
                clearTimeout(timeout);
                reject(err);
            }
        });

        const result = await evalPromise;

        if (result !== undefined) {
            const resultText = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
            return chat.reply(font.monospace(`Result:\n${resultText}`));
        } else {
            return chat.reply(font.monospace('Code executed successfully but returned no value.'));
        }
    } catch (error) {
        const errorText = error.stack || error.message || String(error);
        return chat.reply(font.monospace(`Error:\n${errorText}`));
    }
};