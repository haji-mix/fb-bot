const fs = require("fs");
const axios = require("axios");
const path = require("path");

module.exports["config"] = {
  name: "findgay",
  version: "1.2",
  credits: "Samir Œ",
  cd: 5,
  role: 0,
  info: "findgay meme (just for fun)",
};

module.exports["run"] = async function ({ event, api }) {  
  function getRandomUserID(ids) {
    const randomIndex = Math.floor(Math.random() * ids.length);
    return ids[randomIndex];
  }

  try {
    const groupId = event.threadID;
    const groupInfo = await api.getThreadInfo(groupId);

    const friends = groupInfo.participantIDs.filter(userId => !groupInfo.nicknames[userId]);

    if (friends.length === 0) {
      api.sendMessage("No eligible users found in this group.", event.threadID);
      return;
    }

    const randomUserID = getRandomUserID(friends);
    const realName = await chat.userName(randomUserID);
    const avatarURL = `https://api-canvass.vercel.app/rainbow?userid=${randomUserID}`;

    const pathSave = path.join(__dirname, "cache", `${randomUserID}_gay.png`);

    const response = await axios.get(avatarURL, { responseType: 'arraybuffer' });
    fs.writeFileSync(pathSave, response.data);

    api.sendMessage({
      body: `Look i found a gay: ${realName} 😄`,
      attachment: fs.createReadStream(pathSave)
    }, event.threadID, () => {
      fs.unlinkSync(pathSave);
    });

  } catch (error) {
    api.sendMessage("An error occurred while generating the image.", event.threadID);
  }
};
