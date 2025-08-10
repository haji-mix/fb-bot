const axios = require("axios");

module.exports.config = {
    name: "cosplaytele",
    aliases: ["costele", "cosertele"],
    version: "1.5.0",
    credits: "Kenneth Panio",
    type: "nsfw",
    role: 1,
    description: "Search or Fetch Random NSFW Cosplay.",
    usage: "[character/series/coser]",
    cooldown: 15
};

module.exports.run = async ({ args, message, font }) => {
    
        const generatingMsg = await message.reply(font.thin("🔄 Searching Cosplay Image... Please wait..."));

    try {
        const search = args.join(" ") || "";
      
        const apiUrl = `${global.api.hajime}/api/cosplaytele?search=${encodeURIComponent(search)}&stream=true`;

        const response = await message.arraybuffer(apiUrl);
        generatingMsg.delete();

        return message.reply({
            attachment: response
        });

    } catch (error) {
        generatingMsg.delete();
        message.reply(font.thin(`❌ Error: ${error.message}\nPlease try again later.`));
    }
};