const axios = require("axios");
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
        name: "myth",
        aliases: ["mythomax"],
        isPrefix: false,
        version: "1.0.0",
        credits: "Kenneth Panio",
        role: 0,
        type: "artificial-intelligence",
        info: "Interact with ai mythomax.",
        usage: "[prompt]",
        guide: "myth hello how are you?",
        cd: 6
};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { author } = global.design;
  const { url, models } = global.api.workers.network;
  
  const name = models[1];
  const mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  const query = args.join(" ");
  
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

  if (!query) {
    chat.reply(mono("Please provide a question!"));
    return;
  }

  const answering = await chat.reply(mono("🕐 | Mythomax is Typing..."));
  
  const getResponse = async () => {
     
      try {
              const response = await axios.post(url, { query: query,
                        context: "normal chat\\n This AI responds to user queries in a helpful and informative way.",
                        examples: [],
                        greeting: "Welcome! How can I assist you today?",
                        model: name }, {
                      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.25 Mobile Safari/537.36',
        'Referer': 'https://netwrck.com/ai-chat/-Dragon%20Ball%20AY-',
                      }
              });

      return response.data;
    } catch (error) {
      throw new Error(`Error fetching response from Mythomax AI: ${error.message}`);
    }
  };

  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease use other models get started with 'help'";

  while (attempts < maxRetries && !success) {
    try {
      answer = await getResponse();
      success = true;
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(mono(`No response from Mythomax AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
         answering.edit(mono(`No response from Mythomax AI. Please try again later: ${error.message}`));
        return;
      }
    }
  }

  if (success) {
    const line = "\n" + '━'.repeat(18) + "\n";

    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    const message = font.bold("🤖 | " + name.split('/').pop().toUpperCase()) + line + answer + line;

     answering.edit(message);

  }
};
