const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "dsr1",
  aliases: ["ds"],
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with Deepseek-R1 AI.",
  usage: "[prompt]",
  guide: "dsr1 hello!",
  cd: 6
};

const conversationHistories = {};
let includeMind = false;

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, key, models } = global.api.workers;
  
  const name_model = models.deepseek[4];
  const name = name_model.split('/').pop().toUpperCase();
  
  const mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  const query = args.join(" ").toLowerCase();
  
  if (query === 'toggle') {
    includeMind = !includeMind;
    chat.reply(mono(`Deep Thinking has been ${includeMind ? 'enabled' : 'disabled'}.`));
    return;
  }

  if (['clear', 'reset', 'forgot', 'forget'].includes(query)) {
    conversationHistories[senderID] = [];
    chat.reply(mono("Conversation history cleared."));
    return;
  }

  if (!query) {
    chat.reply(mono("Please provide a question or ask me anything!"));
    return;
  }

  const answering = await chat.reply(mono("🕐 | Generating response..."));

  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

  const getResponse = async () => {
    return axios.post(url + name_model, {
      messages: conversationHistories[senderID]
    }, {
      headers: {
        'Authorization': 'Bearer ' + atob(key),
        'Content-Type': 'application/json',
        'User-Agent': randomUseragent.getRandom()
      }
    });
  };

  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease use other models get started with 'help'";

  while (attempts < maxRetries && !success) {
    try {
      const response = await getResponse();
      answer = response.data.result.response;
      success = true;
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(mono(`No response from DeepSeek AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
         answering.edit(mono("No response from DeepSeek AI. Please try again later: " + error.message));
        return;
      }
    }
  }

  if (success) {
    const mindMatch = answer.match(/([\s\S]*?)<\/think>/);
    let mindContent = "";
    if (mindMatch) {
      mindContent = mindMatch[1] + "\n";
      conversationHistories[senderID].push({ role: "assistant", content: mindContent });
      if (!includeMind) {
        answer = answer.replace(/[\s\S]*?<\/think>/, "").trim();
      }
    }

    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    let message = font.bold(" 🐋 | " + name) + line + (includeMind ? mindContent : '') + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH DEEPTHINK.`);

    await answering.edit(message);

    if (codeBlocks.length > 0) {
      const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
      const cacheFolderPath = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
      const filePath = path.join(cacheFolderPath, uniqueFileName);

      fs.writeFileSync(filePath, allCode, 'utf8');

      const fileStream = fs.createReadStream(filePath);
      await chat.reply({ attachment: fileStream });

      fs.unlinkSync(filePath);
    }
  }
};