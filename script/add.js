module.exports["config"] = {
    name: "adduser",
    version: "1.1.0",
    type: "system",
    isGroup: true,
    role: 0,
    aliases: ["add"],
    usage: '[uid/facebook profile link]',
    info: "Add user to group by UID or Facebook profile link",
};

module.exports["run"] = async ({ api, event, args, chat, font }) => {

    var mono = txt => font.monospace(txt);
    const { threadID } = event;
    const botID = chat.botID();
    const out = msg => chat.reply(mono(msg));

    if (!args[0]) {
        return out("Please enter an ID or Facebook profile link to add.");
    }

    try {
        const { participantIDs, approvalMode, adminIDs } = await api.getThreadInfo(threadID);
        
        const fallback_pid = participantIDs || event.participantIDs;
        
        const parsedParticipantIDs = fallback_pid.map(e => parseInt(e));
        const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
        const input = args[0];
        const isFacebookLink = facebookLinkRegex.test(input);

        let uid;
        if (isFacebookLink || isNaN(input)) {
            uid = await chat.uid(input);
            if (!uid) return out("Unable to retrieve UID from the provided input.");
        } else {
            uid = parseInt(input);
        }

        if (parsedParticipantIDs.includes(uid)) {
            return out(`User ${input} is already in the group.`);
        }

        await addUserToGroup(uid, input, parsedParticipantIDs, approvalMode, adminIDs.map(e => parseInt(e.id)), botID);

    } catch (e) {
        return out(`${e.name}: ${e.message}`);
    }

    async function addUserToGroup(id, name, participants, approvalMode, adminIDs, botID) {
        try {
            await chat.add(id);
        } catch {
            return out(`Can't add ${name ? name : "user"} to the group. They might not have a message button or are not connected to the bot.`);
        }

        if (approvalMode && !adminIDs.includes(botID)) {
            return out(`Added ${name ? name : "member"} to the approved list!`);
        } else {
            return out(`Added ${name ? name : "member"} to the group!`);
        }
    }
};