const axios = require("axios");

module.exports.config = {
    name: "crushimg",
    aliases: ["genimg", "hgen", "agen", "animegen", "animagine"],
    version: "1.5.0",
    type: "text2image",
    credits: "Kenneth Panio",
    role: 0,
    description: "Generate AI art.",
    usage: "[prompt] [--style anime/realistic]",
    cooldown: 15
};

module.exports.run = async ({ args, message, event, font, prefix, admin }) => {
    try {
        const fullText = args.join(" ");
        const useRealistic = fullText.includes("--style realistic");
        const prompt = fullText.replace(/--style\s+\w+/i, "").trim();
        
        if (!prompt) return message.reply(font.thin("Please provide image description.\nExample: " + (prefix || "") + module.exports.config.name + " " + module.exports.config.usage));

        const generatingMsg = await message.reply(font.thin("🔄 Generating your image... Please wait..."));

        const isAdmin = admin.includes(String(event.senderID));
        
        let negativePrompt = "blurry, low quality, distorted";
        
        if (!isAdmin) {
            negativePrompt += ", hentai, nsfw, nude, naked, sexual, porn";
        }

        const apiUrl = `${global.api.hajime}/api/crushimg?${
            new URLSearchParams({
                prompt,
                style: useRealistic ? "realistic" : "anime",
                negative_prompt: negativePrompt
            })
        }`;

        const response = await message.stream(apiUrl);
        generatingMsg.delete();

        return message.reply({
            body: font.bold(`🎨 Generated: ${prompt}`),
            attachment: response
        });

    } catch (error) {
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};