const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "gpt4o",
  isPrefix: false,
  aliases: ["gpt", "gpt4"],
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the chatbot AI.",
  usage: "[prompt]",
  guide: "chatbot How does quantum mechanics work?",
  cd: 6 
};


const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const apiUrl = "https://copyofgeneralassistant-27005.chipp.ai/api/chat";
  const userAgent = randomUseragent.getRandom(ua => ua.browserName === 'Firefox');
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
      chatSessionId: "acab4b36-51b8-4320-bcb4-cacc1b45aa70",
      messages: conversationHistories[senderID]
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'Referer': 'https://copyofgeneralassistant-27005.chipp.ai/w/chat',
        'accept': '*/*',
        'accept-encoding': 'gzip, deflate, br, zstd',
        'accept-language': 'en-US,en;q=0.9',
        'cookie': 'GAESA=Co4BMDBjYTM2OTVkMmY2ZDZhNWM4MWE4NWQzODk0NjE3YjE1ZGY0YmM3N2JkNTkyZDJjNDU4NmFmY2QyYzJmZmU1NWY0MzM1MjQzYzZhMGRkNTlmMjE3NTM5NDM2OTM4Y2VjMDY1OGMyMDBmYzVjZWI0NjQ0MmNkOTA5ZGNkZjcyMTRiYzIyZTdiOTAxNGFhZhDcvv_FxzI',
        'origin': 'https://copyofgeneralassistant-27005.chipp.ai',
        'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
      }
    });
  };

  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease try again later.";

  while (attempts < maxRetries && !success) {
    try {
      const response = await getResponse();
      let fragments = response.data;
      let fragmentArray = fragments.match(/0:".*?"/g);
      if (fragmentArray) {
        let cleanedResponse = fragmentArray.map(fragment => fragment.substring(3, fragment.length - 1)).join("");
        answer = cleanedResponse;
        success = true;
      } else {
        answer = `I don't have an answer for that : (`;
      }

    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(font.monospace(`No response from the GPT4o. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
        answering.edit(font.monospace("No response from the GPT4o. Please try again later: " + error.message));
        return;
      }
    }
  }

  if (success) {
    conversationHistories[senderID].push({ role: "assistant", content: answer });

    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    
    const message = font.bold(" 🤖 | GPT-4o PLUS") + line + answer + line + font.monospace(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

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