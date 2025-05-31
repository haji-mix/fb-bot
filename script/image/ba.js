module.exports = {
    config: {
        name: "ba",
        aliases: ["b"],
        type: "image",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Get a fun blue archive image sir!",
        usages: "ba",
        prefix: true
    },
    run: async ({ chat, event, api, format }) => {
        try {
            const axios = await import("axios").then(module => module.default);

            const response = await axios.get("https://haji-mix.up.railway.app/api/ba?api_key=21b2b7f078ab98cb5af9a0bd4eaa24c4e1c3ec20b1c864006a6f03cf0eee6006", {
                responseType: "json"
            });

            const imageUrl = response.data;
            if (!imageUrl) throw new Error("No image URL found");

            const imageResponse = await axios.get(imageUrl, { responseType: "arraybuffer" });
            const imageBuffer = Buffer.from(imageResponse.data);

            const formattedText = format({
                title: 'Heres your Blue archive Image  ✨',
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
