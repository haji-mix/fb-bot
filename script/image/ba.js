module.exports = {
    config: {
        name: "ba",
        aliases: ["b"],
        type: "anime",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Get a fun Blue Archive image!",
        usages: "ba",
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
                attachment: await chat.stream(global.api.hajime + "/api/ba")
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
