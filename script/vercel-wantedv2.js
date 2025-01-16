const { get } = require('axios');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "wantedv2",
  version: "1.0.0",
  role: 0,
  credits: "Cliff",
  description: "",
  usages: "mention",
  cooldown: 5,
  aliases: []
};

module.exports["run"] = async function ({ api, event, args, chat }) {
  const mentionID = Object.keys(event.mentions)[0];
  if (!mentionID) {
    return api.sendMessage('Please mention a user', event.threadID, event.messageID);
  }

 
  const realName = await chat.userName(mentionID);

  const senderID = event.senderID;
  const url = `https://api-canvass.vercel.app/wanted?userid=${mentionID}`;
  const filePath = path.join(__dirname, 'cache', 'wn.png');

  try {
    let response = await get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(filePath, Buffer.from(response.data, "utf8"));
    let name = await chat.userName(event.senderID);
    let mentions = [];
    mentions.push({
      tag: name,
      id: event.senderID
    });
    api.sendMessage({ attachment: fs.createReadStream(filePath) }, event.threadID, () => {
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    api.sendMessage(`Error: ${error.message}`, event.threadID, event.messageID);
  }
};
