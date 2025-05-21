const axios = require("axios");

module.exports.config = {
    name: "tiktok",
    aliases: ["tt"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "videos",
    description: "Search or Fetch random Tiktok Videos.",
    cooldown: 15
};

module.exports.run = async ({ args, message, font }) => {
    try {

        const search = args.join(" ") || "";
      
        const generatingMsg = await message.reply(font.thin("🔄 Searching Tiktok Videos... Please wait..."));

        const apiUrl = `${global.api.hajime}/api/tiktok?search=${encodeURIComponent(search)}`;

        const response = await message.arraybuffer(apiUrl, "mp4");
        generatingMsg.delete();

        return message.reply({
            attachment: response
        });

    } catch (error) {
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};