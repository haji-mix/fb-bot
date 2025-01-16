const axios = require('axios');

module.exports["config"] = {
  name: "wanted-poster",
  role: 0,
  credits: "Cliff",
  description: "blink",
  usages: "mention or reply reward",
  cooldown: 5,
  aliases: [],
};

module.exports["run"] = async function({ api, event, args, chat }) {
  try {
    const mentionID = Object.keys(event.mentions)[0] || (event.messageReply && event.messageReply.senderID);
    const h = args.join(" ");

    if (!mentionID) {
      return api.sendMessage('Please mention or reply and provide the reward', event.threadID, event.messageID);
    }

    const realName = await chat.userName(mentionID);

    const response = `https://api-canvass.vercel.app/wanted-poster?userid=${mentionID}&name=${encodeURIComponent(realName)}&reward=${encodeURIComponent(h)}`;

    const responsee = await axios.get(response, { responseType: 'stream' });

    return api.sendMessage({
      attachment: responsee.data
    }, event.threadID, event.messageID);

  } catch (err) {
    return api.sendMessage(err, event.threadID, event.messageID);
  }
};
