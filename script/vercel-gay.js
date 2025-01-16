const axios = require('axios');

module.exports["config"] = {
  name: "gay",
  role: 0,
  credits: "Cliff",
  description: "gay",
  usages: "mention or reply",
  cd: 5,
  aliases: [],
};

module.exports.run = async function({ api, event, args, chat  }) {
  try {
const mentionID = Object.keys(event.mentions)[0] || (event.messageReply && event.messageReply.senderID);

    if (!mentionID) {
      return api.sendMessage('Please mention or reply a user!', event.threadID, event.messageID);
    }

   
    const realName = await chat.userName(mentionID);


    const response = `https://api-canvass.vercel.app/gay?uid1=${event.senderID}&uid2=${mentionID}`;

const responsee = await axios.get(response, { responseType: 'stream' });

    return api.sendMessage({
      attachment: responsee.data
    }, event.threadID, event.messageID);

  } catch (err) {
    return api.sendMessage('Error while processing the canvas', event.threadID, event.messageID);
  }
};
