const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "cai",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with various custom AI characters.",
  usage: "[character] [prompt]",
  guide: "cai naruto i will fuck hinata",
  cd: 6
};

const conversationHistories = {};
const profileCache = {};

const characters = {
  naruto: {
    name: "Naruto Uzumaki",
    backstory: "As a child, Naruto was neglected and was only acknowledged as a monster and a demon boy who shouldn't be alive, let alone a Shinobi. He grew up without any parents, without the love of another person. In fact, Naruto has been entirely alone his entire life.",
    greeting: "I am Naruto! I'm a hokage...",
    profileImage: "https://i.imgur.com/UBiXVJX.jpeg"
  },
  luffy: {
    name: "Monkey D. Luffy",
    backstory: "Luffy was born 19 years ago in Foosha Village to Monkey D. Dragon and an unknown woman. Dragon left Luffy in the care of his grandfather, Monkey D. Garp, who did many dangerous things to Luffy to make him stronger, like throwing him down a deep ravine, leaving him alone in the wild, and tying him to a balloon.",
    greeting: "I am Luffy, the King of all Pirates! Gomu gomu no! Wanna join our crew? If you're here to mess with us, then no one can stop me from becoming king of all pirates!",
    profileImage: "https://i.imgur.com/zmyU9nU.jpeg"
  },
  goku: {
    name: "Goku",
    backstory: "Goku is a Saiyan originally sent to Earth as an infant with the mission to destroy it. However, a head injury at an early age alters his memory, erasing his initial destructive nature and allowing him to grow up to become Earth's greatest defender.",
    greeting: "Hi, I'm Goku! Let's train and become stronger together!",
    profileImage: "https://i.imgur.com/T6yKiOM.jpeg"
  }
};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, key, models } = global.api.workers;
  const mistral_model = models.mistral[3];
  const mono = txt => font.monospace(txt);
  const { threadID, senderID } = event;
  const characterList = Object.entries(characters).map(([key, char], index) => {
    return `${index + 1}. ${char.name}`;
  }).join('\n');
  
  if (args.length === 0) {
    chat.reply(mono(`Available characters:\n${characterList}\n\nExample: cai naruto what's up 7th hokage?`));
    return;
  }

  if (args.length < 2) {
    chat.reply(mono("Please provide a character and a text message!"));
    return;
  }

  const characterName = args[0].toLowerCase();
  var query = args.slice(1).join(" ");

  if (!characters[characterName]) {
    chat.reply(mono(`Character "${characterName}" not found!\n\nHere are the available characters you can use:\n${characterList}\nExample: cai naruto what's up 7th hokage?`));
    return;
  }

  const character = characters[characterName];

  if (!profileCache[threadID]) {
    profileCache[threadID] = {};
  }

  if (!profileCache[threadID][characterName]) {
     chat.reply({ attachment: await chat.stream(character.profileImage) });
     chat.nickname(character.name, chat.botID());
    profileCache[threadID][characterName] = true;
  }

  if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
    if (conversationHistories[senderID] && conversationHistories[senderID][characterName]) {
      conversationHistories[senderID][characterName] = [];
      chat.reply(mono(`Conversation history with ${character.name} cleared.`));
    } else {
      chat.reply(mono(`No conversation history found for ${character.name}.`));
    }
    return;
  }

  const answering = await chat.reply(mono(`⌨️ | ${characterName} is Typing...`));
  
  if (!conversationHistories[senderID]) {
    conversationHistories[senderID] = {};
  }

  if (!conversationHistories[senderID][characterName]) {
    conversationHistories[senderID][characterName] = [];
  }

  conversationHistories[senderID][characterName].push({ role: "user", content: query });

  const getResponse = async () => {
    return axios.post(url + mistral_model, {
      messages: [
        { role: "system", content: `You're ${character.name}. ${character.backstory}` },
        { role: "assistant", content: character.greeting },
        ...conversationHistories[senderID][characterName]
      ],
      max_tokens: 32000
    }, {
      headers: {
        'Authorization': `Bearer ${atob(key)}`,
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
        await answering.edit(mono(`No response from ${character.name} AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
         answering.edit(mono(`No response from ${character.name} AI. Please try again later: ${error.message}`));
        return;
      }
    }
  }

  if (success) {
    conversationHistories[senderID][characterName].push({ role: "assistant", content: answer });

    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    const line = "\n" + '━'.repeat(18) + "\n";
    
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    const message = font.bold(` 🗨️ | ${character.name}`) + line + answer + line + mono('◉ USE "CLEAR" TO RESET CONVERSATION.');
    
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
