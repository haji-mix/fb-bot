module.exports["config"] = {
  name: "resend",
  info: 'catch people unsent message and resends it',
  version: "1.0.0",
  usage: "[on/off]",
};

var msgData = {};
var resendEnabled = false;

module.exports["handleEvent"] = async ({ api, event, chat }) => {
try {
  if (event.type == 'message') {
    msgData[event.messageID] = {
      body: event.body, 
      attachments: event.attachments
    }
  }

  if (event.type == "message_unsend" && msgData.hasOwnProperty(event.messageID) && resendEnabled) { 
    const name = await chat.userName(event.senderID);
    const axios = require('axios');
    const fs = require("fs");

    if (msgData[event.messageID].attachments.length === 0) {
      chat.reply(`${name} unsent this message: ${msgData[event.messageID].body}`)  
    } else if (msgData[event.messageID].attachments[0].type == 'photo')  {   
      var photo = [];
      var del = [];
      for (const item of msgData[event.messageID].attachments) {
        let { data } = await axios.get(item.url, {responseType: "arraybuffer"});
        fs.writeFileSync(`./script/cache/${item.filename}.jpg`, Buffer.from(data));
        photo.push(fs.createReadStream(`./script/cache/${item.filename}.jpg`));
        del.push(`./script/cache/${item.filename}.jpg`);
      }
      chat.reply({body:`${name} unsent this photo: ${msgData[event.messageID].body}`, attachment: photo}, () => {
        for (const item of del) fs.unlinkSync(item);
      }); 
    } else if (msgData[event.messageID].attachments[0].type == 'audio') { 
      let { data } = await axios.get(msgData[event.messageID].attachments[0].url, {responseType: "arraybuffer"});
      fs.writeFileSync(`./script/cache/audio.mp3`, Buffer.from(data));
      chat.reply({body:`${name} unsent this voice message: ${msgData[event.messageID].body}`, attachment: fs.createReadStream('./script/cache/audio.mp3')}, () => {
        fs.unlinkSync('./script/cache/audio.mp3');
      });
    } else if (msgData[event.messageID].attachments[0].type == 'animated_image') {
      let { data } = await axios.get(msgData[event.messageID].attachments[0].previewUrl, {responseType: "arraybuffer"});
      fs.writeFileSync(`./script/cache/animated_image.gif`, Buffer.from(data));
      api.sendMessage({body:`${name} unsent this gif: ${msgData[event.messageID].body}`, attachment: fs.createReadStream('./script/cache/animated_image.gif')}, event.threadID, () => {
        fs.unlinkSync('./script/cache/animated_image.gif');
      });     
    }
  }
} catch (error) {
  console.error('An error occurred:', error);
}
}

module.exports["run"] = async function ({ api, args, chat }) {
const command = args.join(" ").trim().toLowerCase();
if (command === "on") {
  resendEnabled = true;
  chat.reply("Resend functionality is now enabled");
} else if (command === "off") {
  resendEnabled = false; 
  chat.reply("Resend functionality is now disabled");
} else {
  chat.reply("This is an event process that automatically resends users deleted messages. Type 'on' to enable or 'off' to disable resend functionality.");
}
}
