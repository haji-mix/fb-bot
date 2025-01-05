
const fs = require("fs");
const util = require("util");
const path = require("path");
const os = require("os");

module.exports["config"] = {
    name: "active-session",
    aliases: ["botstatus"],
    info: "Show the bot's running time and the number of active bots.",
    type: "system",
    version: "1.4.0",
    role: 1,
    cd: 5,
};

const historyFilePath = path.resolve(__dirname, "..", "data", "history.json");
let historyData = [];
try {
    historyData = fs.existsSync(historyFilePath) ? require(historyFilePath) : [];
} catch (readError) {
    console.error(`Error reading history.json: ${readError.message}`);
}

module.exports["run"] = async ({ event, args, chat, fonts }) => {
    try {
        const { threadID, messageID } = event;

        if (!historyData.length) {
            chat.reply("No active bots found.");
            return;
        }

        const currentUser Id = chat.botID?.() || "unknown";
        const mainBotIndex = historyData.findIndex(user => user.userid === currentUser Id);
        if (mainBotIndex === -1) {
            chat.reply("Main bot not found in history. Try again later!");
            return;
        }

        const mainBot = historyData[mainBotIndex];
        const mainBotName = await getUser Name(chat, currentUser Id);
        const mainBotRunningTime = convertTime(mainBot.time || 0);
        const activeBotsCount = historyData.length; 

        const message = `BOT NAME: ${mainBotName}\nID: ${currentUser Id}\nBOT RUNNING TIME: ${mainBotRunningTime}\n\nActive Bots: ${activeBotsCount}`;
        chat.contact(fonts.thin(message), chat.botID?.());
    } catch (error) {
        chat.reply(`Error occurred: ${error.message}`);
    }
};

function getUser Name(chat, userID) {
    return chat.userInfo(userID)
        .then(userInfo => userInfo?.[userID]?.name || "unknown")
        .catch(() => "unknown");
}

function convertTime(timeValue) {
    const totalSeconds = parseInt(timeValue, 10) || 0;
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const remainingHours = Math.floor((totalSeconds % (24 * 60 * 60)) / 3600);
    const remainingMinutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    const timeParts = [
        days > 0 && `${days} day(s)`,
        remainingHours > 0 && `${remainingHours} hour(s)`,
        remainingMinutes > 0 && `${remainingMinutes} minute(s)`,
        remainingSeconds > 0 && `${remainingSeconds} second(s)`
    ].filter(Boolean);

    return timeParts.length ? timeParts.join(" ") : "0 seconds";
}
