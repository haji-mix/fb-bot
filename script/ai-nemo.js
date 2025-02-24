const axios = require("axios");
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "nemo",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with Mistral Nemo AI chatbot.",
  usage: "[prompt]",
  guide: "nemo hello how are you?",
  cd: 6
};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { author } = global.design;
  const { key, models } = global.api.workers.huggingface;
  const mistral_model = models.mistral[1];
  const name = mistral_model.split('/').pop().toUpperCase();
  const mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  let query = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

  if (!query) {
    chat.reply(mono("Please provide a question!"));
    return;
  }

  const answering = await chat.reply(mono("🕐 | Mistral Nemo is Typing..."));
  
  const getResponse = async () => {
    try {
      const response = await axios.post(`https://api-inference.huggingface.co/models/${mistral_model}/v1/chat/completions`, {
        model: mistral_model,
        messages:  [{ role: "user", content: query }],
        max_tokens: 32752,
        stream: false,
      }, {
        headers: {
          'Authorization': `Bearer ${atob(key)}`,
          'Content-Type': 'application/json',
         }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      throw new Error(`Error fetching response from Mistral Nemo AI: ${error.message}`);
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
        await answering.edit(mono(`No response from Mistral Nemo AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
         answering.edit(mono(`No response from Mistral Nemo AI. Please try again later: ${error.message}`));
        return;
      }
    }
  }

  if (success) {
    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";

    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    const message = font.bold("🤖 | " + name) + line + answer + line;

    answering.edit(message);

  }
};
