const fs = require('fs-extra');
const path = require('path');
const configPath = path.join(__dirname, '../kokoro.json');

module.exports["config"] = {
  name: "user",
  version: "1.1.0",
  isPrefix: true,
  role: 1,
  info: "Ban or unban a user by their UID.",
  usage: "[ban/unban] [uid or Facebook link]",
  credits: "Kenneth Panio",
};

module.exports["run"] = async ({ event, args, chat, font }) => {
  const { threadID } = event;

  if (!fs.existsSync(configPath)) {
    return chat.reply(font.thin("❗ Configuration file not found!"), threadID);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (!config.blacklist) config.blacklist = [];

  const action = args[0];
const input = args[1] ?? (event.messageReply ? event.messageReply.senderID : null);

if (!action || !input) {
    return chat.reply(font.thin("❓ incorrect syntax. use: user [ban/unban] [uid or facebook profile link]"), threadid);
}

  try {
    let uid = input;

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    if (facebookLinkRegex.test(input)) {
      uid = await chat.uid(input);
      if (!uid) {
        return chat.reply(font.thin("❗ Unable to retrieve UID from the provided Facebook link."), threadID);
      }
    }

    if (action === 'ban') {
      if (config.blacklist.includes(uid)) {
        return chat.reply(font.thin(`❗ User ${uid} is already banned.`), threadID);
      }

      config.blacklist.push(uid);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return chat.reply(font.thin(`✅ User ${uid} has been banned.`), threadID);
    }

    if (action === 'unban') {
      if (!config.blacklist.includes(uid)) {
        return chat.reply(font.thin(`❓ User ${uid} is not in the blacklist.`), threadID);
      }

      config.blacklist = config.blacklist.filter(user => user !== uid);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
      return chat.reply(font.thin(`✅ User ${uid} has been unbanned.`), threadID);
    }

    chat.reply(font.thin("❓ Invalid action. Use: user [ban/unban] [uid or Facebook profile link]"), threadID);

  } catch (error) {
    chat.reply(font.thin(error.message || "❌ An error occurred while processing the command."), threadID);
  }
};
