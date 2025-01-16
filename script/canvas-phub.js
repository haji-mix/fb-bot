const {
  createCanvas,
  loadImage
} = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
//const request = require('request');
//const Canvas = require('canvas');

module.exports["config"] = {
    name: "phub",
    version: "1.0",
    role: 0,
    credits: "Markdevs69",
    info: "pornhub memes",
    usage: "[text]",
    cd: 5
};

const wrapText = (ctx, text, maxWidth) => {
    return new Promise(resolve => {
        if (ctx.measureText(text).width < maxWidth) return resolve([text]);
        if (ctx.measureText('W').width > maxWidth) return resolve(null);
        const words = text.split(' ');
        const lines = [];
        let line = '';
        while (words.length > 0) {
            let split = false;
            while (ctx.measureText(words[0]).width >= maxWidth) {
                const temp = words[0];
                words[0] = temp.slice(0, -1);
                if (split) words[1] = `${temp.slice(-1)}${words[1]}`;
                else {
                    split = true;
                    words.splice(1, 0, temp.slice(-1));
                }
            }
            if (ctx.measureText(`${line}${words[0]}`).width < maxWidth) line += `${words.shift()} `;
            else {
                lines.push(line.trim());
                line = '';
            }
            if (words.length === 0) lines.push(line.trim());
        }
        return resolve(lines);
    });
}

module.exports["run"] = async function({ api, event, args, chat }) {
  const { senderID, messageID, threadID } = event;
 let avatar = __dirname + '/cache/avt.png';
  let pathImg = __dirname + '/cache/porn.png';
  var text = args.join(" ");
  let name = await chat.userName(senderID);
  let get_info = await api.getInfo(senderID);
  var linkAvatar = get_info.profile_img || `https://graph.facebook.com/${senderID}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
  if (!text) return api.sendMessage("Enter the content of the comment on p*rnhub", event.threadID, event.messageID);
  let getAvatar = (await axios.get(linkAvatar, { responseType: 'arraybuffer' })).data;
  let getSaiki = (await axios.get(`https://i.imgur.com/XrgnIyK.png`, { responseType: 'arraybuffer' })).data;
  fs.writeFileSync(avatar, Buffer.from(getAvatar, 'utf-8'));
  fs.writeFileSync(pathImg, Buffer.from(getSaiki, 'utf-8'));
  let image = await loadImage(avatar);
  let baseImage = await loadImage(pathImg);
  let canvas = createCanvas(baseImage.width, baseImage.height);
  let ctx = canvas.getContext("2d");
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(image, 30, 310, 70, 70);
  ctx.font = "700 23px Arial";
  ctx.fillStyle = "#FF9900";
  ctx.textAlign = "start";
  ctx.fillText(name, 115, 350);
  ctx.font = "400 23px Arial";
  ctx.fillStyle = "#ffff";
  ctx.textAlign = "start";
  let fontSize = 23;
  while (ctx.measureText(text).width > 2600) {
    fontSize--;
    ctx.font = `400 ${fontSize}px Arial, sans-serif`;
  }
  const lines = await wrapText(ctx, text, 1160);
  ctx.fillText(lines.join('\n'), 30,430);
  ctx.beginPath();
  const imageBuffer = canvas.toBuffer();
  fs.writeFileSync(pathImg, imageBuffer);
  fs.removeSync(avatar);
  return api.sendMessage(
    { attachment: fs.createReadStream(pathImg) },
    event.threadID,
    () => fs.unlinkSync(pathImg),
    event.messageID
  );
};
