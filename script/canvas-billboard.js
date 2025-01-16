const {
  createCanvas,
  loadImage
} = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');

module.exports["config"] = {
    name: "billboard",
    version: "1.0",
    role: 0,
    hasPrefix: true,
    credits: "developer",
    description: "biliboard",
    usage: "[text]",
    cooldowns: 5
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

module.exports["run"] = async function({ api, event, args, botname, chat }) {
  const { senderID } = event;
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const pathImg = __dirname + '/cache/' + `${timestamp}_billboard.png`
    const text = args.join(" ");

    if (!text) {
    return api.sendMessage("Enter the content of the comment on the board", event.threadID, event.messageID);
    }

    try {
      
        const name = await chat.userName(senderID);
        
        const getPorn = (await axios.get(`https://i.imgur.com/nRoikQP.png`, { responseType: 'arraybuffer' })).data;
        api.setMessageReaction("🧐", event.messageID, () => {}, true);
      //fs.writeFileSync(getAvatar, Buffer.from(getAvatar, 'utf-8'));
        fs.writeFileSync(pathImg, Buffer.from(getPorn, 'utf-8'));
        const baseImage = await loadImage(pathImg);
        const canvas = createCanvas(baseImage.width, baseImage.height);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(baseImage, 5, 5, canvas.width, canvas.height);
        ctx.font = "700 14px Arial";
        ctx.fillStyle = "#fffff";
        ctx.textAlign = "center";
        ctx.fillText(name, 440, 340);
      ctx.font = "400 18px Arial";
      ctx.fillStyle = "#fffff";
      ctx.textAlign = "start";
        let fontSize = 10;
        while (ctx.measureText(text).width > 2600) {
            fontSize--;
            ctx.font = `400 ${fontSize}px Arial, sans-serif`;
        }
        const lines = await wrapText(ctx, text, 180);
        ctx.fillText(lines.join('\n'), 358, 375); // Adjust position
        ctx.beginPath();
        const imageBuffer = canvas.toBuffer();
        fs.writeFileSync(pathImg, imageBuffer);
        api.setMessageReaction("😆", event.messageID, () => {}, true);
        api.sendMessage({ 
          body: ``,
          attachment: fs.createReadStream(pathImg)
}, event.threadID, () => fs.unlinkSync(pathImg), event.messageID);
    } catch (error) {
        console.log(error);
        api.sendMessage("An error occurred while processing the command", event.threadID, event.messageID);
    }
};
