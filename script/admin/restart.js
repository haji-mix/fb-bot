
module.exports = {
    config: {
        name: "restart",
        aliases: ["reboot", "refresh"],
        usage: '',
        type: "admin",
        author: "Kenneth Panio",
        role: 3,
        cooldowns: 30,
        description: "Restart the bot system",
        prefix: true
    },
    run: async ({ chat, format, UNIRedux }) => {
        try {
            await chat.reply(
                format({
                    title: 'SYSTEM REBOOT 🛠️ ',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: '🔄 Bot is restarting... Please wait 10-20 seconds.'
                })
            );

            setTimeout(() => {
                process.exit(0); 
            }, 1000); 

        } catch (error) {
            await chat.reply(
                format({
                    title: 'RESTART FAILED 🛠️ ',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: `Error: ${ error.stack || error.message || "Something wen't wrong!"}`
                })
            );
        }
    }
};