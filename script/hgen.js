const axios = require("axios");

module.exports["config"] = {
    name: "hgen",
    isPrefix: false,
    version: "1.0.0",
    info: "Generates hentai images based on a prompt",
    usage: "[prompt]"
};

module.exports["run"] = async ({ chat, args, font }) => {
    const prompt = args.join(" ");

    if (!prompt) {
        return chat.reply(font.thin("Please provide a prompt to generate images. e.g: hgen cute girl!"));
    }

    const generating = await chat.reply(font.thin("Generating Images •••"));

    try {
        const url = 'https://mahi-apis.onrender.com/api/hentai?prompt=';
        const response = await axios.get(`${url}${encodeURIComponent(prompt)}`, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.40 Mobile Safari/537.36'
            }
        });

        const data = response.data;

        if (!data.combinedImage && (!data.imageUrls || Object.keys(data.imageUrls).length === 0)) {
            generating.unsend();
            return chat.reply(font.thin("Image Generation Temporary Unavailable!"));
        }

        const imageUrls = [
            data.combinedImage,
            ...Object.values(data.imageUrls)
        ].filter(Boolean);

        generating.unsend();

        if (imageUrls.length > 0) {
            const attachments = await Promise.all(
                imageUrls.map(async (url) => await chat.stream(url))
            );

            return chat.reply({
                attachment: attachments,
            });
        }

        chat.reply(font.thin("No images were generated."));
    } catch (error) {
        generating.unsend();
        chat.reply(font.thin(error.message));
    }
};
