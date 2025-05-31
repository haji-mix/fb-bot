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

            const response = await axios.get("https://haji-mix-api.gleeze.com/api/ba", {
                responseType: "arraybuffer"
            });

            const imageBuffer = Buffer.from(response.data);
            if (!imageBuffer || imageBuffer.length === 0) throw new Error("No image data received");

            const formattedText = format({
                title: 'Heres your Blue archive Image ✨',
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Here's your Blue Archve!!`
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
