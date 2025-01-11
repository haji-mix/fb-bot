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

    const generating = await chat.reply(font.thin("Generating Image •••"));

    try {
        const url = 'https://mahi-apis.onrender.com/api/hentai?prompt=';
        const response = await axios.get(`${url}${encodeURIComponent(prompt)}`);

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

         chat.reply({
                attachment: await chat.arraybuffer(imageUrls, "png")
            });

    } catch (error) {
        generating.unsend();
        chat.reply(font.thin(error.message));
    }
};
