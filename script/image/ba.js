module.exports = {
    config: {
        name: "ba",
        aliases: ["b"],
        type: "image",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Get a fun BA image!",
        usages: "ba",
        prefix: true
    },
    run: async ({ chat, event, api, format }) => {
        try {
            const axios = await import("axios").then(module => module.default);

            const { data } = await axios.get("https://haji-mix-api.gleeze.com/api/ba", {
                responseType: "json"
            });

            const imageUrl = data.url || data.image || data.result;
            if (!imageUrl) throw new Error("No image URL found");

            const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const imageBuffer = Buffer.from(imageResponse.data);

            const formattedText = format({
                title: 'Heres your Blue Archive ✨',
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Here's your BA image!`
            });

            await chat.reply({
                body: formattedText,
                attachment: imageBuffer
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
