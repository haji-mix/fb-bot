const fs = require('fs');

let antiNicknameChangeEnabled = true;
const filePath = './data/history.json';

module.exports.config = {
  name: "antichnn",
  aliases: ["antinn", "anti-chname", "anti-changenickname", "antichangenn", "antichn", "antichangenickname", "anti-nn", "antichname"],
  version: "1.0.0",
  credits: "team atomic slash studio",
  info: "Anti-Nickname Change Feature",
  usage: "[on/off]",
};

module.exports["run"] = async ({ args, chat, font, event }) => {
  const mono = txt => font.monospace(txt);

  if (!args[0]) {
    chat.reply(mono("Please provide a command. Use 'on' to enable antichname or 'off' to disable it."));
    return;
  }

  const command = args[0].toLowerCase();

  // Check if both the user and bot are admins
  const botID = await chat.botID();
  const threadInfo = await chat.threadInfo(event.threadID);
  const isAdmin = threadInfo.adminIDs.some(adminInfo => adminInfo.id === event.senderID);
  const isBotAdmin = threadInfo.adminIDs.some(adminInfo => adminInfo.id === botID);

  if (!isAdmin || !isBotAdmin) {
    chat.reply('🛡️ | You and the bot need to be administrators of the group chat to toggle antichname on or off.');
    return;
  }

  if (command === "on") {
    antiNicknameChangeEnabled = true;
    chat.reply(mono("Anti-nickname change feature is now enabled."));
  } else if (command === "off") {
    antiNicknameChangeEnabled = false;
    chat.reply(mono("Anti-nickname change feature is now disabled."));
  } else {
    chat.reply(mono("Invalid command. Use 'on' to enable anti-nickname change or 'off' to disable it."));
  }
};

module.exports["handleEvent"] = async ({ event, chat, font }) => {
  if (!antiNicknameChangeEnabled) return;

  const mono = txt => font.monospace(txt);

  try {
    const authorID = event.author;
    const data = fs.readFileSync(filePath, 'utf8');
    const bots = JSON.parse(data);

    // Extract bot IDs from history.json
    const botIDs = bots.map(bot => bot.userid);

    // Check if event author matches any bot ID
    if (botIDs.includes(authorID)) {
      return; // Exit early if the event author is a bot
    }

    if (event.logMessageType === "log:user-nickname") {
      const { participant_id, nickname } = event.logMessageData;

      // Ignore nickname changes that clear the nickname
      if (!nickname) return;

      if (authorID !== chat.botID() && authorID !== participant_id) {
        chat.nickname("", participant_id); // Reset nickname to empty
        chat.reply(mono("Anti-Change Nickname is Active!"));
      }
    }
  } catch (error) {
    console.log(error.message || "Can't Reset Nickname!");
  }
};
