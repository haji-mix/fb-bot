const axios = require("axios");

module.exports["config"] = {
  name: "law",
  aliases: ["lawsofpower", "powerlaw"],
  info: "get a random law from the Laws of Power",
  isPrefix: false,
  version: "1.0.0",
  cd: 8,
};

module.exports["run"] = async ({ chat, font, event }) => {
  try {
    const response = await axios.get("https://raw.githubusercontent.com/haji-mix/-/refs/heads/master/haxor/laws.json");
    const lawsOfPower = response.data;
    
    const randomIndex = Math.floor(Math.random() * lawsOfPower.length);
    const randomLaw = lawsOfPower[randomIndex];

    const lawText = `${randomLaw.name} - ${randomLaw.title}\n\n${randomLaw.desc}`;
    chat.reply(font.monospace(lawText), event.threadID, event.messageID);
  } catch (error) {
    chat.reply(font.monospace(error.message), event.threadID, event.messageID);
  }
};
