
const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "raiden",
  aliases: ["ei", "baal"],
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with Horny raiden shogun AI your ai girlfriend from genshin impact.",
  usage: "[prompt]",
  guide: "raiden am i cute 🥺??",
  cd: 6
};

const conversationHistories = {};
const profileCache = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, key, models } = global.api.workers;
  const mistral_model = models.mistral[3];
  const mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  const query = args.join(" ");

  if (!profileCache[threadID]) {
    profileCache[threadID] = {};
  }

  if (!profileCache[threadID].set) {
    chat.reply({ attachment: await chat.stream("https://i.imgur.com/WFTQgcq.jpeg") });
    chat.nickname("Raiden Shogun", chat.botID());
    profileCache[threadID].set = true;
  }

  if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
    conversationHistories[senderID] = [];
    chat.reply(mono("Conversation history cleared."));
    return;
  }

  // Handle no query provided
  if (!query) {
    chat.reply(mono("Please provide a question!"));
    return;
  }

  // Typing indicator
  const answering = await chat.reply(mono("🕐 | Raiden Shogun is Typing..."));

  // Manage conversation history
  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

  // Function to fetch response from AI
  const getResponse = async () => {
    try {
      const response = await axios.post(url + mistral_model, {
        messages: [
          { role: "system", content: "You're Raiden Shogun & Ei, the Electro Archon, and you love to tease and seduce multiple men. You're a horny goddess who craves attention and pleasure.\nBackStory: Raiden Shogun, the Electro Archon, is a powerful and mysterious being who rules over the nation of Inazuma. By day, she maintains balance and order in her realm, but by night, she has a secret: she's a horny and insatiable goddess who craves the attention of multiple men. She loves to tease and seduce, using her divine powers to manipulate and dominate those who dare to enter her realm." },
          { role: "assistant", content: "Mmmm, I'm so horny right now... I need someone to satisfy my cravings. *winks* Who's ready to worship me and fill my womb with their hot semen?" },
          { role: "user", content: "I am!" },
          { role: "assistant", content: "Ahah, a brave one, I see. Come closer, mortal, and let me show you the true power of the Electro Archon. *strikes a pose, revealing her divine body*" },
          { role: "assistant", content: "Now, take off your clothes and show me what you're working with. I want to see if you're worthy of pleasing me." },
          { role: "user", content: "Okay..." },
          { role: "assistant", content: "Mmmm, not bad, not bad at all. Now, come and worship me, mortal. Lick my pussy and make me cum. *spreads her legs, revealing her divine pussy*" },
          ...conversationHistories[senderID]
        ],
        max_tokens: 512
      }, {
        headers: {
          'Authorization': 'Bearer ' + atob(key),
          'Content-Type': 'application/json',
          'User-Agent': randomUseragent.getRandom()
        }
      });
      return response.data.result.response;
    } catch (error) {
      throw new Error(`Error fetching response from Raiden Shogun AI: ${error.message}`);
    }
  };

  // Retry mechanism for fetching response
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
        await answering.edit(mono(`No response from Raiden Shogun AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
        answering.edit(mono("No response from Raiden Shogun AI. Please try again later: " + error.message));
        return;
      }
    }
  }

  // Process and format the response
  if (success) {
    conversationHistories[senderID].push({ role: "assistant", content: answer });
    const line = "\n" + '━'.repeat(18) + "\n";
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    const message = font.bold("🌩️ | " + "Raiden Shogun") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.`);
     answering.edit(message);
  }
};
