const axios = require('axios');

module.exports.config = {
  name: "whowouldwin",
  version: "1.0.0",
  role: 0,
  aliases: ["www"],
  credits: "Kaizenji",
  description: "Determine who would win between two users.",
  usage: "{p}whowouldwin",
  cooldown: 5,
};

const fontMapping = {
  a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂", j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆",
  n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋", s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
  A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨", J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬",
  N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱", S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝗒", Z: "𝖹"
};

function formatFont(text) {
  return text.split('').map(char => fontMapping[char] || char).join('');
}

module.exports.run = async function ({ api, event, chat }) {
  const { threadID, messageID, senderID } = event;

  try {
    const name1 = await chat.userName(senderID);

    const participants = (await api.getThreadInfo(threadID)).participantIDs;
    let id2;
    do {
      id2 = participants[Math.floor(Math.random() * participants.length)];
    } while (id2 === senderID);

    const name2 = await chat.userName(id2);

    const url = `https://api.popcat.xyz/whowouldwin?image1=https://api-canvass.vercel.app/profile?uid=${senderID}&image2=https://api-canvass.vercel.app/profile?uid=${id2}`;

    const response = await axios.get(url, { responseType: 'stream' });

    const messageBody = formatFont(`Who would win? ${name1} vs ${name2}!`);

    api.sendMessage({
      body: messageBody,
      mentions: [{ id: senderID, tag: name1 }, { id: id2, tag: name2 }],
      attachment: response.data
    }, threadID, messageID);
  } catch (error) {
    api.sendMessage(formatFont(`Error: ${error.message}`), threadID, messageID);
  }
};
