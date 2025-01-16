const fs = require("fs");
const path = require("path");

const badWords = [
    "fuck", "bulok", "tangina", "bwesit", "abnoy", "skid", "boang", "bullshit",
    "gago", "bubu", "bobo", "abno", "piste", "pornhub.com", "pinayflix",
    "lexi lore", "bolok", "tanga", "live.gore", "livegore", "childporn",
    "kontol", "anjing", "vovo", "pota", "potangina", "vagina", "pussy",
    "dick", "penis", "brainless", "gay", "nigger", "nigga", "adolf", "hitler", "gay", "orphan", "contro"
];

let autokickSettings = {};
let kickedUsers = {};
let userMessageHistory = {};
let userWarnings = {};
let addWarnings = {};

const filePath = path.join(__dirname, "system", "autokick.json");
if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    autokickSettings = data.autokickSettings || {};
    kickedUsers = data.kickedUsers || {};
}

const getUserName = async (chat, senderID) => {
    try {
        const userName = await chat.userName(senderID);
        return userName;
    } catch (error) {
        return "User";
    }
};

const handleEvent = async ({ chat, event }) => {
    if (!event.isGroup) return;
    const threadID = event.threadID;
    if (!autokickSettings[threadID]) return;

    const botID = chat.botID();
    const authorID = event.author;
    const senderID = event.senderID;

    if (authorID === botID || senderID === botID || !senderID) return;

    try {
        const threadInfo = await chat.threadInfo(threadID);

        // Check if threadInfo and adminIDs are valid
        if (!threadInfo || !Array.isArray(threadInfo.adminIDs)) return;

        const isAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);
        const isBotAdmin = threadInfo.adminIDs.some(admin => admin.id === botID);

        if (!isAdmin && isBotAdmin) {
            const message = (event.body || "").toLowerCase();

            userMessageHistory[senderID] = userMessageHistory[senderID] || [];
            userMessageHistory[senderID].push({ message, timestamp: Date.now() });
            userMessageHistory[senderID] = userMessageHistory[senderID].filter(
                msg => Date.now() - msg.timestamp <= 10000
            );

            const messageCount = userMessageHistory[senderID].length;
            const repeatedMessages = userMessageHistory[senderID].filter(msg => msg.message === message).length;
            const isSpamming = repeatedMessages >= 3 || messageCount >= 5;

            if (badWords.some(word => message.includes(word))) {
                userWarnings[senderID] = (userWarnings[senderID] || 0) + 1;
                const userName = await getUserName(chat, senderID);

                if (userWarnings[senderID] >= 3) {
                    try {
                        await chat.kick(senderID);
                        await chat.contact(`${userName} has been removed from the group for using inappropriate language multiple times.`, senderID);
                    } catch (error) {
                        console.error(`Error kicking user ${senderID}: ${error.message}`);
                    }
                } else {
                    await chat.reply(`Warning: (${userWarnings[senderID]}/3) Do not use inappropriate language, ${userName}.`);
                }
            }

            if (isSpamming) {
                const userName = await getUserName(chat, senderID);
                try {
                    await chat.kick(senderID);
                    await chat.reply(`You have been removed for spamming, ${userName}.`);
                    await chat.contact(`${userName} has been removed from the group for spamming.`, senderID);
                } catch (error) {
                    console.error(`Error kicking user ${senderID}: ${error.message}`);
                }
            }
        } else if (event.type === "log:subscribe") {
            const addedParticipants = event.logMessageData?.addedParticipants || [];
            if (addedParticipants.length > 0) {
                const addedUserID = addedParticipants[0].userFbId;
                const addedByID = event.author;

                if (kickedUsers[addedUserID] && Date.now() - kickedUsers[addedUserID] < 5 * 60 * 1000) {
                    addWarnings[addedByID] = (addWarnings[addedByID] || 0) + 1;
                    const userName = await getUserName(chat, addedByID);

                    if (addWarnings[addedByID] >= 3) {
                        try {
                            await chat.kick(addedByID);
                            await chat.reply(`You have been removed for attempting to add previously removed members multiple times, ${userName}.`);
                            await chat.contact(`${userName} has been removed from the group for attempting to add previously removed members multiple times.`, addedByID);
                        } catch (error) {
                            console.error(`Error kicking user ${addedByID}: ${error.message}`);
                        }
                    } else {
                        await chat.reply(`Warning: (${addWarnings[addedByID]}/3) You cannot add previously removed members, ${userName}. You must wait a few minutes to add that member again.`);
                    }
                }
            }
        } else if (event.type === "log:unsubscribe") {
            const leftParticipantFbId = event.logMessageData?.leftParticipantFbId;
            if (leftParticipantFbId && event.senderID === chat.botID()) {
                kickedUsers[leftParticipantFbId] = Date.now();
            }
        }
    } catch (error) {
        console.error(`Error handling event autokick: ${error.message}`);
    }
};

const run = async ({ chat, event, args }) => {
    if (!event.isGroup) {
        return chat.reply("You can only use this in group chats.");
    }
    
    const threadID = event.threadID;
    if (args.length === 0) {
        return chat.reply(
            `🦵 | Autokick is currently ${autokickSettings[threadID] ? "enabled" : "disabled"} for this thread. Use "autokick on" or "autokick off" to toggle it.`
        );
    }

    const option = args[0]?.toLowerCase();
    if (!["on", "off"].includes(option)) {
        return chat.reply('🦵🏻 | Use "autokick on" to enable or "autokick off" to disable autokick.');
    }

    autokickSettings[threadID] = option === "on";
    fs.writeFileSync(filePath, JSON.stringify({ autokickSettings, kickedUsers }), "utf-8");

    return chat.reply(`🦵🏿 | Autokick has been ${option === "on" ? "enabled" : "disabled"} for this thread.`);
};

module.exports = {
    handleEvent,
    run,
    config: {
        name: "autokick",
        version: "1.0.0",
        credits: "Kenneth Panio",
        info: "Automatically kick users who use bad words or spam in the group chat",
        type: "moderation",
        usage: "[on/off]"
    }
};
