module.exports = {
    config: {
        name: "eval",
        aliases: ["evaluate", "ev"],
        usage: '[code]',
        type: "admin",
        author: "Kenneth Panio",
        role: 3, 
        cooldowns: 10,
        description: "Evaluate Node.js code in a sandboxed environment",
        prefix: true
    },
    run: async ({ api, event, args, chat, box, message, font, fonts, blacklist, prefix, admin, Utils, FontSystem, format, UNIRedux }) => {
        try {
            const code = args.join(" ");
            if (!code) {
                return chat.reply(
                    format({
                        title: 'EVALUATION ERROR 💻',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        titleFont: 'double_struck',
                        contentFont: 'fancy_italic',
                        content: 'Please provide code to evaluate.'
                    })
                );
            }

            const sandbox = {
                require: require,
                console: {
                    log: (...args) => chat.reply(args.join(' ')),
                    error: (...args) => chat.reply(args.join(' ')),
                    warn: (...args) => chat.reply(args.join(' ')),
                    info: (...args) => chat.reply(args.join(' ')),
                    debug: (...args) => chat.reply(args.join(' ')),
                    trace: (...args) => chat.reply(args.join(' '))
                },
                process: process,
                setTimeout,
                setInterval,
                setImmediate,
                clearTimeout,
                clearInterval,
                clearImmediate,
                api,
                event,
                chat,
                box,
                message,
                font,
                fonts,
                blacklist,
                prefix,
                admin,
                Utils,
                FontSystem,
                format,
                UNIRedux
            };

            let result;
            try {
                result = await new Function('sandbox', `with(sandbox){return (async () => { ${code} })()}`)(sandbox);
            } catch (e) {
                throw new Error(`Evaluation error: ${e.message}`);
            }

            const output = result !== undefined 
                ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
                : "N/A";

            return chat.reply(
                format({
                    title: 'EVALUATION RESULT 💻',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: `✅ Code executed successfully!\n\nOutput:\n${output.slice(0, 10000)}`
                })
            );

        } catch (error) {
            return chat.reply(
                format({
                    title: 'EVALUATION ERROR 💻',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: error.message || 'An error occurred during evaluation.'
                })
            );
        }
    }
};