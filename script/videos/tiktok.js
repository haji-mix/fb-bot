const axios = require("axios");

module.exports.config = {
    name: "tiktok",
    aliases: ["tt"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "videos",
    description: "Search or Fetch random Tiktok Videos.",
    usage: "[search query]",
    cooldown: 15
};

module.exports.run = async ({ args, message, font }) => {
    
        const generatingMsg = await message.reply(font.thin("🔄 Searching Tiktok Videos... Please wait..."));

    try {

        const search = args.join(" ") || "";
      
        const apiUrl = `${global.api.hajimev2}/api/tiktok?search=${encodeURIComponent(search)}`;

        const response = await message.arraybuffer(apiUrl, "mp4");
        generatingMsg.delete();

        return message.reply({
            attachment: response
        });

    } catch (error) {
        generatingMsg.delete();
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};