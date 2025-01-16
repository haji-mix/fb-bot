let antiOutEnabled = true;

module.exports["config"] = {
  name: "anti-out",
  aliases: ["antiout"],
  info: "Prevents user or members from leaving the group.",
  version: "1.0.1",
  usage: "[on/off]",
};

const fs = require("fs").promises;
const filePath = './data/history.json';

module.exports["handleEvent"] = async ({ event, api, chat, font }) => {
  var mono = txt => font.monospace(txt);
  if (!antiOutEnabled) return;
  
  var nagleft = event.logMessageData?.leftParticipantFbId;

  if (!nagleft) return;

  try {
    const data = await fs.readFile(filePath, 'utf8');
    const bots = JSON.parse(data);
    const botIDs = bots.map(bot => bot.userid);
    const threadInfo = await chat.threadInfo(event.threadID);

    if (botIDs.includes(nagleft) || nagleft === api.getCurrentUserID()) {
      return;
    }

    const name = await chat.userName(event.logMessageData.leftParticipantFbId);
    api.addUserToGroup(event.logMessageData.leftParticipantFbId, event.threadID, (error) => {
      if (error) {
        api.sendMessage(mono(`Unable to re-add member ${name} to the group!`), event.threadID);
      } else {
        api.sendMessage(mono(`Active anti-out mode, ${name} has been re-added to the group successfully!`), event.threadID);
      }
    });
  } catch (error) {
    console.error(error);
  }
};

module.exports.run = async ({ args, chat, font }) => {
  var mono = txt => font.monospace(txt);
  const command = args.join(" ").trim().toLowerCase();

  if (command === "on") {
    antiOutEnabled = true;
    chat.reply(mono("Anti out mode is now enabled."));
  } else if (command === "off") {
    antiOutEnabled = false;
    chat.reply(mono("Anti out mode is now disabled."));
  } else {
    chat.reply(mono("Type 'on' to enable anti out mode or 'off' to disable it."));
  }
};
