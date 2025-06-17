const axios = require("axios");

module.exports["config"] = {
    name: "aria",
    info: "Interact with Aria AI Capable of Search Across the web to answer your queries.",
    usage: "[prompt]",
    guide: "aria hello",
    prefix: false,
    cd: 6,
    category: "artificial-intelligence",
    credits: "Kenneth Panio | Liane Cagara"
};

module.exports["run"] = async ({ args, chat, font, event, format }) => {
    let ask = args.join(" ");
    
    if (event.type === "message_reply" && event.messageReply?.body) {
        ask += `\n\nUser replied with this message: ${event.messageReply.body}`;
    }
  
    if (!ask) return chat.reply(font.thin("Please provide a prompt to ask Aria."));
    const answering = await chat.reply(font.thin("Generating response..."));
    try {
        const apiRes = await axios.post(global.api.hajime + "/api/aria", {
            ask: ask
        });
        
        answering.unsend();
        const { answer } = apiRes.data;
        const responseMessage = format({ 
            title: "ARIA 🌐", 
            content: answer, 
            noFormat: true, 
            contentFont: 'none' 
        });
        chat.reply(responseMessage);
    } catch (error) {
        answering.unsend();
        chat.reply(font.thin(error.stack || error.message || "An error occurred while processing your request."));
    }
};