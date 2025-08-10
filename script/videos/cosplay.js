const axios = require("axios");

module.exports.config = {
    name: "cosplay",
    aliases: ["coser", "cos"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "videos",
    description: "Fetch Random Cosplay Videos.",
    cooldown: 15
};

module.exports.run = async ({ message, font }) => {
    
  const generatingMsg = await message.reply(font.thin("🔄 Searching Cosplay Videos... Please wait..."));


    try {
        const apiUrl = `${global.api.hajime}/api/cosplay?stream=true`;

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