const axios = require('axios');

module.exports["config"] = {
  name: 'groupinfo',
  aliases: ["group-info", "group-status", "groupstatus", "tid", "gid", "threadinfo"],
  info: 'Provides detailed information about the current chat group.',
  type: "information",
  version: '1.0.0',
  isGroup: true,
  role: 1,
  cd: 10,
};

module.exports["run"] = async ({ event, chat, font }) => {
    const threadInfo = await chat.threadInfo(event.threadID);
    
    if (!threadInfo) {
        return chat.reply("This feature is temporary not available! (Blocked By Meta)");
    }
    
    const totalParticipants = threadInfo?.participantIDs.length;
    const adminIDs = threadInfo.adminIDs.map(admin => admin.id);
    const totalAdmins = adminIDs.length;
    const botID = chat.botID();
    const botIsAdmin = adminIDs.includes(botID);
    const threadName = threadInfo.threadName || "Unnamed Group";
    const threadID = event.threadID;
    
    const userInfo = await chat.userInfo(event.senderID);
    const senderName = userInfo[event.senderID]?.name || "Unknown";
    const imageSrc = threadInfo.imageSrc;

    const responseMessage = `
𝗚𝗿𝗼𝘂𝗽 𝗜𝗻𝗳𝗼𝗿𝗺𝗮𝘁𝗶𝗼𝗻
𝗡𝗮𝗺𝗲: ${threadName}
𝗧𝗵𝗿𝗲𝗮𝗱 𝗜𝗗: ${threadID}
𝗧𝗼𝘁𝗮𝗹 𝗣𝗮𝗿𝘁𝗶𝗰𝗶𝗽𝗮𝗻𝘁𝘀: ${totalParticipants}
𝗔𝗱𝗺𝗶𝗻𝘀: ${totalAdmins}
𝗕𝗼𝘁 𝗜𝗱: ${botID}
𝗕𝗼𝘁 𝗶𝘀 𝗔𝗱𝗺𝗶𝗻: ${botIsAdmin ? "Yes" : "No"}
𝗥𝗲𝗾𝘂𝗲𝘀𝘁𝗲𝗱 𝗯𝘆: ${senderName}
    `.trim();

    if (imageSrc) {
      const image = await axios.get(imageSrc, { responseType: "stream" });
      await chat.reply(responseMessage);
      await chat.reply({ attachment: image.data });
    } else {
      chat.reply(font.monospace(responseMessage));
    }
  };
