const axios = require("axios");

module.exports.config = {
    name: "cosplay",
    aliases: ["coser", "cos"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "nsfw",
    role: 1,
    description: "Search or Fetch Random Cosplay.",
    cooldown: 15
};

module.exports.run = async ({ args, message, font }) => {
    try {
        const search = args.join(" ") || "";
      
        const generatingMsg = await message.reply(font.thin("🔄 Searching Cosplay Image... Please wait..."));

        const apiUrl = `${global.api.hajime}/api/cosplay?stream=true`;

        const response = await message.arraybuffer(apiUrl);
        generatingMsg.delete();

        return message.reply({
            attachment: response
        });

    } catch (error) {
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};