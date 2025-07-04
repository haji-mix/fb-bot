module.exports = {
    config: {
        name: "ba",
        aliases: ["bluearchive"],
        type: "anime",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Get a fun Blue Archive image!",
        prefix: true
    },
    run: async ({ chat, event, api, format }) => {
        try {
            const formattedText = format({
                title: 'Blue Archive ✨',
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Here's your Blue Archive image!`
            });

            await chat.reply({
                body: formattedText,
                attachment: global.api.hajime + "/api/ba"
            });
        } catch (error) {
            const errorText = format({
                title: 'BA ERROR ❌',
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Failed to fetch image: ${error.message}`
            });
            chat.reply(errorText);
        }
    }
};
