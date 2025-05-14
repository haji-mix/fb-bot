const axios = require("axios");

module.exports["config"] = {
    name: "beago",
    aliases: ["bgo", "bea"],
    info: "Interact with Beago AI - Aria Based Model Capable of Search Across the web to answer your queries.",
    usage: "[prompt]",
    guide: "beago hello",
    prefix: false,
    cd: 6,
    category: "artificial-intelligence",
    credits: "Kenneth Panio | Liane Cagara"
};

module.exports["run"] = async ({ args, chat, font, event, format }) => {
    const ask = args.join(" ");
    if (!ask) return chat.reply(font.thin("Please provide a prompt to ask Beago."));
    const answering = await chat.reply(font.thin("Generating response..."));
    try {
        const apiRes = await axios.get(global.api.hajime + "/api/beago", {
            params: {
                ask: ask,
                uid: event.senderID,
            }
        });
        answering.unsend();
        const { answer } = apiRes.data;
        const responseMessage = format({ title: "BEAGO 🌐", content: answer, noFormat: true, contentFont: 'none' });
        chat.reply(responseMessage);
    } catch (error) {
        answering.unsend();
        chat.reply(font.thin(error.stack || error.message || "An error occurred while processing your request."));
    }
}