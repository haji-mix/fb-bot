const fs = require('fs');
const path = require('path');
const tsNode = require('ts-node');  // Import ts-node to execute TypeScript dynamically

module.exports["config"] = {
    name: "evaljs",
    isPrefix: false,
    aliases: ["evaluate", "run", "exec", "execute", "evaljavascript", "eval", "evalts", "evaltypescript"],
    usage: "[code] or reply to a message with code",
    info: "Evaluate and execute JavaScript or TypeScript code.",
    guide: "Use eval [code] to execute JavaScript or TypeScript code or reply to a message with code.",
    type: "Programming",
    credits: "Kenneth Panio",
    version: "2.3.6",
    role: 3,
};

module.exports["run"] = async ({ api, event, args, chat, box, message, font, fonts, global, blacklist, prefix, admin, Utils }) => {
    let code;

    if (event.type === "message_reply" && event.messageReply && (event.messageReply.attachments.length === 0 || /https?:\/\/[^\s]+/.test(event.messageReply.body))) {
        code = event.messageReply.body;
    } else {
        code = args.join(' ');
    }

    if (!code) {
        return chat.reply(font.monospace('Please provide the JavaScript or TypeScript code to evaluate.'));
    }

    const logMessages = [];
    const errorMessages = [];
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => logMessages.push(args.join(' '));
    console.error = (...args) => errorMessages.push(args.join(' '));

    const evalPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('Evaluation timed out.')), 30000);
        (async () => {
            try {
                // Detect if the code looks like TypeScript
                const isTypeScript = code.includes("import") || code.includes("interface") || code.includes("type");

                // Use ts-node for TypeScript, eval for JavaScript
                let result;
                if (isTypeScript) {
                    result = await tsNode.register().compile(code); // Compile TypeScript dynamically
                    result = await eval(result);  // Execute the transpiled JavaScript
                } else {
                    result = await eval(`(async () => { try { ${code} } catch (error) { chat.reply(error.message || JSON.stringify(error)); } })()`);
                }

                clearTimeout(timeout);
                resolve(result);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        })();
    });

    try {
        const result = await evalPromise;
        console.log = originalLog;
        console.error = originalError;

        const response = {
            logs: logMessages,
            errors: errorMessages,
            result: result !== undefined ? result : 'No result returned',
        };

        const shouldSendAsAttachment = typeof response.result === 'object' ||
            response.logs.some(log => typeof log === 'object') ||
            response.errors.some(error => typeof error === 'object') ||
            JSON.stringify(response).length > 1000;

        if (shouldSendAsAttachment) {
            const cacheFolderPath = path.join(__dirname, "cache");
            if (!fs.existsSync(cacheFolderPath)) fs.mkdirSync(cacheFolderPath);
            const filePath = path.join(cacheFolderPath, `Eval_Result_${event.senderID}_${Math.floor(Math.random() * 10000)}.json`);
            fs.writeFileSync(filePath, JSON.stringify(response, null, 2), 'utf-8');
            await chat.reply({ body: code, attachment: fs.createReadStream(filePath) });
            fs.unlinkSync(filePath);
        } else {
            const responseText = [
                logMessages.length > 0 && `Logs:\n${logMessages.join('\n')}`,
                errorMessages.length > 0 && `Errors:\n${errorMessages.join('\n')}`,
                result !== undefined && `Result: ${result}`
            ].filter(Boolean).join('\n\n');

            if (responseText) chat.reply(font.monospace(responseText));
        }
    } catch (error) {
        console.log = originalLog;
        console.error = originalError;
        chat.reply(font.monospace(`Error: ${error.message}`));
    }
};
