module.exports.config = {
    name: "kick",
    version: "1.0.0",
    credits: "Kenneth Panio",
    info: "Kick members or yourself",
    role: 2,
    isGroup: true,
    usage: "[uid/@mention/link/me/all/members]",
};

module.exports.run = async ({
    event, chat, args, font
}) => {

    const botID = chat.botID();
    const threadInfo = await chat.threadInfo(event.threadID);
    const adminIDs = (threadInfo?.adminIDs || []).map(admin => admin.id);

    if (!threadInfo || !adminIDs) {
        return chat.reply(font.monospace("Bot is temporarily blocked by Facebook, can't use this feature : <"));
    }

    if (!adminIDs.includes(botID)) {
        return chat.reply(font.monospace("I cannot kick members because I am not an admin in this group."));
    }

    const targetInput = args[0]?.toLowerCase();

    if (targetInput === "members") {
        chat.reply(font.monospace("Kicking all group members excluding Admins and Bot itself..."));

        for (const participantID of threadInfo?.participantIDs || event?.participantIDs) {
            if (participantID !== botID && !adminIDs.includes(participantID)) {
                await chat.kick(participantID);
            }
        }

        return chat.reply(font.monospace("All non-admin members have been kicked from the chat."));
    }

    if (targetInput === "all") {
        chat.reply(font.monospace("Initiating fun kick... Kicking everyone including admins!"));

        for (const participantID of threadInfo.participantIDs) {
            if (participantID !== botID) {
                await chat.kick(participantID);
            }
        }

        await chat.kick(botID);
        return chat.reply(font.monospace("All members, including admins, have been kicked. The bot will now leave the group."));
    }

    let targetID;
    if (targetInput === "me") {
        targetID = event.senderID;
    } else {
        const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
        if (facebookLinkRegex.test(targetInput)) {
            targetID = await chat.uid(targetInput);
        } else if (Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        } else {
            targetID = targetInput;
        }
    }

    if (!targetID) {
        return chat.reply(font.monospace("Please enter a valid user ID/@mention or profile link."));
    }

    await chat.kick(targetID);
    chat.reply(font.monospace(`User ${targetID} has been kicked from the chat.`));
};