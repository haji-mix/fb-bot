const axios = require("axios");

module.exports.config = {
    name: "shoti",
    aliases: ["shawty"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "videos",
    description: "Fetch Random Shoti Videos.",
    cooldown: 15
};

module.exports.run = async ({ message, font }) => {
    try {
      
        const generatingMsg = await message.reply(font.thin("🔄 Searching Cosplay Videos... Please wait..."));

        const res = await axios.get(`${global.api.hajimev2}/api/shawty?stream=true`);
        generatingMsg.delete();

        return message.reply({
            body: `Tiktoker UID: ${res.data.meta.author.unique_id}`,
            attachment: res.data.url
        });

    } catch (error) {
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};