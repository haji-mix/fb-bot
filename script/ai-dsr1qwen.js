const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "dsq",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with Deepseek-R1 Distill Qwen 32B AI.",
  usage: "[prompt]",
  guide: "dsq hello!",
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
  let query = args.join(" ");
  
  if (query.toLowerCase() === 'toggle') {
    includeMind = !includeMind;
    chat.reply(mono(`Deep Thinking has been ${includeMind ? 'enabled' : 'disabled'}.`));
    return;
  }

  if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
    conversationHistories[senderID] = [];
    chat.reply(mono("Conversation history cleared."));
    return;
  }
  
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
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
      messages: conversationHistories[senderID],
      max_tokens: 32000
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

    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    let message = font.bold(" 🐋 | " + name) + line + (includeMind ? mindContent : '') + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH DEEPTHINK.`);

     answering.edit(message);

  }
};