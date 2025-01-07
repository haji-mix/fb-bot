const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "gpt4o",
  isPrefix: false,
  aliases: ["openai4o", "gpt", "gpt4", "ai"],
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with GPT-4o AI.",
  usage: "[prompt]",
  guide: "gpt4o How does quantum mechanics work?",
  cd: 6 
};

const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const apiUrl = "https://api.eduide.cc/v1/chat/completions";
  const userAgent = randomUseragent.getRandom() || 'Mozilla/5.0';
  const { threadID, senderID } = event;
  const query = args.join(" ");

  if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
    conversationHistories[senderID] = [];
    chat.reply(font.monospace("Conversation history cleared."));
    return;
  }

  if (!query) {
    chat.reply(font.monospace("Please provide a question!"));
    return;
  }

  const answering = await chat.reply(font.monospace("🕐 | Generating response..."));

  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

  const getResponse = async () => {
    return axios.post(apiUrl, {
      model: "gpt-4o",
      messages: conversationHistories[senderID]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Referer': 'https://aiassistantbot.surge.sh/',
      }
    });
  };

  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease use other models; get started with 'help'.";

  while (attempts < maxRetries && !success) {
    try {
      const response = await getResponse();
      answer = response.data.choices[0].message.content;
      success = true;
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(font.monospace(`No response from GPT-4o. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
        answering.edit(font.monospace("No response from GPT-4o. Please try again later: " + error.message));
        return;
      }
    }
  }

  if (success) {
    conversationHistories[senderID].push({ role: "assistant", content: answer });

    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    
    const message = font.bold(" 🤖 | GPT-4o") + line + answer + line + font.monospace(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

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
