const axios = require('axios');

module.exports["config"] = {
  name: "nigga",
  role: 0,
  credits: "Cliff",
  description: "blink",
  usages: "mention or reply",
  cooldown: 5,
  aliases: ["ride"],
};

module.exports["run"] = async function({ api, event, args, chat }) {
  try {
const mentionID = Object.keys(event.mentions)[0] || (event.messageReply && event.messageReply.senderID);

    if (!mentionID) {
      return api.sendMessage('Please mention or reply a user you want to hug!', event.threadID, event.messageID);
    }

    const realName = await chat.userName(mentionID);

/**  let userID;

    if (args.length === 0) {
      if (event.messageReply) {
        userID = event.messageReply.senderID;
      } else {
        userID = event.senderID;
      }
    } else if (Object.keys(event.mentions).length === 0) {
      userID = args.join(" ");
    } else {
      for (const mentionID in event.mentions) {
        userID = mentionID;
        break;
      }
    } **/

    const response = `https://api-canvass.vercel.app/nigga?userid=${mentionID}`;

const responsee = await axios.get(response, { responseType: 'stream' });

    return api.sendMessage({
      attachment: responsee.data
    }, event.threadID, event.messageID);

  } catch (err) {
    return api.sendMessage('Error while processing nigga ride request', event.threadID, event.messageID);
  }
};
