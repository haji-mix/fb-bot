const fs = require("fs");
const util = require("util");
const path = require("path");
const os = require("os");

const unlinkAsync = util.promisify(fs.unlink);

const historyFilePath = path.resolve(__dirname, '..', 'data', 'history.json');

let historyData = [];

try {
  historyData = require(historyFilePath);
} catch (readError) {
  console.error('Error reading history.json:', readError);
}

module.exports.config = {
  name: 'session',
  aliases: ["active-session","activelist"],
  info: 'List all active bots in the history session.',
  type: "system",
  version: '1.4.0',
  role: 1,
  cd: 0,
dependencies: {
		"process": ""
	}
};

module.exports.run = async function ({ chat, fonts, api, event, args }) {
  const { threadID, messageID } = event;

 if (args[0] && args[0].toLowerCase() === 'logout') {
    await logout(api, event);
    return;
  }

  if (historyData.length === 0) {
    api.sendMessage(tin('No users found in the history configuration.', threadID, messageID));
    return;
  }

  const currentUserId = api.getCurrentUserID();
  const mainBotIndex = historyData.findIndex(user => user.userid === currentUserId);

  if (mainBotIndex === -1) {
    api.sendMessage('Main bot not found in history.', threadID, messageID);
    return;
  }

  const tin = txt => fonts.tin(txt);
  const mainBot = historyData[mainBotIndex];
  const mainBotName = await getUserName(api, currentUserId);
  const mainBotOSInfo = getOSInfo();
  const mainBotRunningTime = convertTime(mainBot.time);

  const userPromises = historyData
    .filter((user) => user.userid !== currentUserId)
    .map(async (user, index) => {
      const userName = await getUserName(api, user.userid);
      const userRunningTime = convertTime(user.time);
      return `${index + 1}. 𝗡𝗔𝗠𝗘: ${userName}\n𝗨𝗣𝗧𝗜𝗠𝗘: ${userRunningTime}`;
    });

  const userList = (await Promise.all(userPromises)).filter(Boolean);

  const userCount = userList.length;

  const userMessage = `𝗠𝗔𝗜𝗡𝗕𝗢𝗧: ${mainBotName}\n𝗕𝗢𝗧 𝗥𝗨𝗡𝗡𝗜𝗡𝗚: ${mainBotRunningTime}\n\n| SYSTEM |\n\n${mainBotOSInfo}\n\n𝗢𝗧𝗛𝗘𝗥 𝗦𝗘𝗦𝗦𝗜𝗢𝗡 [${userCount}]\n\n${userList.join('\n')}\n\nEvery restart will increase the session's uptime.`;

  chat.reply(tin(userMessage, threadID, messageID));
};

async function logout(api, event) {
  const { threadID, messageID } = event;
  const currentUserId = api.getCurrentUserID();
  const jsonFilePath = path.resolve(__dirname, '..', 'data', 'session', `${currentUserId}.json`);

  try {
    await unlinkAsync(jsonFilePath);
    api.sendMessage(tin('Bot Has been Logout!.', threadID, messageID, ()=> process.exit(1)));
  } catch (error) {
    console.error('Error deleting JSON file:', error);
    api.sendMessage(tin('Error during logout. Please try again.', threadID, messageID));
  }
}

async function getUserName(api, userID) {
  try {
    const userInfo = await api.getUserInfo(userID);
    return userInfo && userInfo[userID] ? userInfo[userID].name : "unknown";
  } catch (error) {
    return "unknown";
  }
}

function getOSInfo() {
  const osInfo = `${os.type()} ${os.release()} ${os.arch()} (${os.platform()})`;
  const totalMemory = formatBytes(os.totalmem());
  const freeMemory = formatBytes(os.freemem());
  return `OS: ${osInfo}\nCPU: ${os.cpus()[0].model}\nCores: ${os.cpus().length}\nTotal Memory: ${totalMemory}\nFree Memory: ${freeMemory}`;
}

function convertTime(timeValue) {
  const totalSeconds = parseInt(timeValue, 10);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const remainingHours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
  const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  return `${days} days ${remainingHours} hours ${remainingMinutes} minutes ${remainingSeconds} seconds`;
}

function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(100 * (bytes / Math.pow(1024, i))) / 100 + ' ' + sizes[i];
}