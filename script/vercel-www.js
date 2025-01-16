const axios = require('axios');

module.exports["config"] = {
  name: "whowouldwin",
  version: "1.0.0",
  role: 0,
  aliases: ["www"],
  credits: "Kaizenji",
  description: "Determine who would win between two users.",
  usage: "{p}whowouldwin",
  cooldown: 5,
};

let fontEnabled = true;

function formatFont(text) {
  const fontMapping = {
    a: "𝖺", b: "𝖻", c: "𝖼", d: "𝖽", e: "𝖾", f: "𝖿", g: "𝗀", h: "𝗁", i: "𝗂", j: "𝗃", k: "𝗄", l: "𝗅", m: "𝗆",
    n: "𝗇", o: "𝗈", p: "𝗉", q: "𝗊", r: "𝗋", s: "𝗌", t: "𝗍", u: "𝗎", v: "𝗏", w: "𝗐", x: "𝗑", y: "𝗒", z: "𝗓",
    A: "𝖠", B: "𝖡", C: "𝖢", D: "𝖣", E: "𝖤", F: "𝖥", G: "𝖦", H: "𝖧", I: "𝖨", J: "𝖩", K: "𝖪", L: "𝖫", M: "𝖬",
    N: "𝖭", O: "𝖮", P: "𝖯", Q: "𝖰", R: "𝖱", S: "𝖲", T: "𝖳", U: "𝖴", V: "𝖵", W: "𝖶", X: "𝖷", Y: "𝗒", Z: "𝖹"
  };

  let formattedText = "";
  for (const char of text) {
    if (fontEnabled && char in fontMapping) {
      formattedText += fontMapping[char];
    } else {
      formattedText += char;
    }
  }

  return formattedText;
}

module.exports["run"] = async function ({ api, event, args, chat }) {
  const { threadID, messageID, senderID } = event;

  let dataa = await chat.userName(senderID);
  let namee = await dataa[senderID].name;

  let loz = await api.getThreadInfo(threadID);
  let participants = loz.participantIDs;

  let id1 = senderID;
  let id2;
  do {
    id2 = participants[Math.floor(Math.random() * participants.length)];
  } while (id2 === id1);

  let data1 = await chat.userName(id1);
  let name1 = data1[id1].name;

  let data2 = await chat.userName(id2);
  let name2 = data2[id2].name;

  let arraytag = [];
  arraytag.push({ id: id1, tag: name1 });
  arraytag.push({ id: id2, tag: name2 });

  let messageBody = formatFont(`Who would win? ${name1} vs ${name2}!`);

  let url = `https://api.popcat.xyz/whowouldwin?image1=https://api-canvass.vercel.app/profile?uid=${id1}&image2=https://api-canvass.vercel.app/profile?uid=${id2}`;

  try {
    let response = await axios.get(url, { responseType: 'stream' });

    api.sendMessage({
      body: messageBody,
      mentions: arraytag,
      attachment: response.data
    }, threadID, messageID);
  } catch (err) {
    api.sendMessage(formatFont(`Error: ${err.message}`), threadID, messageID);
  }
};
