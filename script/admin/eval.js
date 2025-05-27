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

        const logs = [];

        const customConsole = {
            log: (...args) => logs.push(`[log] ${args.join(' ')}`),
            error: (...args) => logs.push(`[error] ${args.join(' ')}`),
            warn: (...args) => logs.push(`[warn] ${args.join(' ')}`),
            info: (...args) => logs.push(`[info] ${args.join(' ')}`),
            debug: (...args) => logs.push(`[debug] ${args.join(' ')}`),
            trace: (...args) => logs.push(`[trace] ${args.join(' ')}`)
        };

        const sandbox = {
            require,
            process,
            setTimeout,
            setInterval,
            setImmediate,
            clearTimeout,
            clearInterval,
            clearImmediate,
            console: customConsole,
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
            result = await new Function('sandbox', `
                with (sandbox) {
                    return (async () => {
                        ${code}
                    })();
                }
            `)(sandbox);

            const output = result !== undefined
                ? (typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result))
                : "";

            return chat.reply(
                format({
                    title: 'EVALUATION RESULT 💻',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: `✅ Code executed successfully!\n\nLogs:\n${logs.join('\n') || 'None'}\n\nOutput:\n${output}`.slice(0, 10000)
                })
            );

        } catch (error) {
            return chat.reply(
                format({
                    title: 'EVALUATION ERROR 💻',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: `❌ An error occurred.\n\nLogs:\n${logs.join('\n') || 'None'}\n\nError:\n${error.message}`.slice(0, 10000)
                })
            );
        }
    }
};
