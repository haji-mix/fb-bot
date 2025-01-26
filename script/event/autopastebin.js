const axios = require("axios");

module.exports["config"] = {
    name: "pasteraw",
    role: 0,
    credits: "AkhiroDEV", // modified by Kenneth Panio
    info: "Detect and get the code through Pastebin",
    cd: 5
};

module.exports["handleEvent"] = async ({ chat, args, event }) => {
    const message = event.body?.split(' ')[0];

    if (!/^https:\/\/pastebin\.com\/[a-zA-Z0-9]{8}$/.test(message) && !/^https:\/\/pastebin\.com\/raw\/[a-zA-Z0-9]{8}$/.test(message)) {
        return;
    }

    const rawUrl = message.startsWith("https://pastebin.com/raw/")
        ? message
        : message.replace(/^https:\/\/pastebin\.com\/([a-zA-Z0-9]{8})$/, 'https://pastebin.com/raw/$1');

    try {

        const { data } = await axios.get(rawUrl);
        const modifiedData = data.includes('module.exports')
            ? data.replace(/\bmodule\.exports\.(run|config|handleEvent|handleReply)\b/g, 'module.exports["$1"]')
            : data;

        chat.reply(modifiedData);
    } catch (error) {
        console.error(`ERROR: ${error.message}`);
    }
};
