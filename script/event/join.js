const threadCache = new Map();
let joinNotificationEnabled = true;

module.exports["config"] = {
    name: "joinnoti",
    info: "Enables or disables join notifications for new members joining the group.",
    credits: "Kenneth Panio",
    version: "1.0.0 still beta",
    usage: "[on/off]",
};

module.exports["handleEvent"] = async ({
    event, chat, font, prefix, Utils
}) => {
    try {
        const mono = txt => font.monospace(txt);
        const { Currencies } = Utils;

        if (!joinNotificationEnabled) return;

        const getOrdinalSuffix = number => {
            const lastDigit = number % 10;
            const lastTwoDigits = number % 100;
            if (lastDigit === 1 && lastTwoDigits !== 11) return "st";
            if (lastDigit === 2 && lastTwoDigits !== 12) return "nd";
            if (lastDigit === 3 && lastTwoDigits !== 13) return "rd";
            return "th";
        };

        let groupInfo = threadCache.get(event.threadID);
        if (!groupInfo) {
            groupInfo = {
                data: await chat.threadInfo(event.threadID)
            };
            threadCache.set(event.threadID, groupInfo);
        }

        const { logMessageType, logMessageData } = event;

        if (logMessageType === "log:subscribe") {
            const joinedUserId = logMessageData?.addedParticipants?.[0]?.userFbId;

            if (!joinedUserId) return;

            groupInfo.data.participantIDs = groupInfo.data.participantIDs || [];
            if (!groupInfo.data.participantIDs.includes(joinedUserId)) {
                groupInfo.data.participantIDs.push(joinedUserId);
                threadCache.set(event.threadID, groupInfo);
            }

            let name = await Currencies.getName(joinedUserId);
            if (!name) {
                try {
                    const userName = await chat.userName(joinedUserId);
                    if (userName && typeof userName === 'string' && userName.trim()) {
                        await Currencies.setName(joinedUserId, userName.trim());
                        name = userName.trim();
                    }
                } catch (error) {}
            }
            const displayName = name || `User ${joinedUserId}`;

            if (joinedUserId === chat.botID()) {
                chat.reply({
                    attachment: await chat.stream("https://files.catbox.moe/5swmuv.gif")
                });
                await chat.contact(mono(`Bot connected successfully to ${groupInfo.data?.name || "Group Chat"}\n\nGet started with "HELP" to see more commands.`), chat.botID());
                await chat.nickname(`${font.bold("CHATBOX SYSTEM")} ${mono(`> [${prefix || "No Prefix"}]`)}`, chat.botID());
            } else {
                const memberCount = groupInfo.data?.participantIDs?.length || event?.participantIDs?.length;

                const message = memberCount !== undefined && memberCount !== null
                    ? `Welcome ${displayName} to ${groupInfo.data?.name || "Our Group"}! You're the ${memberCount}${getOrdinalSuffix(memberCount)} member.`
                    : `Welcome ${displayName} to our group! Please enjoy your stay.`;

                const url_array = [
                    "https://i.imgur.com/9UIo0dq.gif"
                ];

                const url = await chat.stream(url_array[Math.floor(Math.random() * url_array.length)]);

                if (url) {
                    chat.reply({
                        attachment: url
                    });
                }

                chat.contact(mono(message), joinedUserId);
            }
        } else if (logMessageType === "log:unsubscribe") {
            const leftParticipantFbId = logMessageData?.leftParticipantFbId;
            if (!leftParticipantFbId) return;

            if (groupInfo.data.participantIDs) {
                groupInfo.data.participantIDs = groupInfo.data.participantIDs.filter(id => id !== leftParticipantFbId);
                threadCache.set(event.threadID, groupInfo);
            }

            let name = await Currencies.getName(leftParticipantFbId);
            if (!name) {
                try {
                    const userName = await chat.userName(leftParticipantFbId);
                    if (userName && typeof userName === 'string' && userName.trim()) {
                        await Currencies.setName(leftParticipantFbId, userName.trim());
                        name = userName.trim();
                    }
                } catch (error) {}
            }
            const displayName = name || `User ${leftParticipantFbId}`;

            const type = event.author === leftParticipantFbId ? "left by itself" : "has been kicked by the administrator";
            chat.contact(mono(`Oops! ${displayName} ${type}. We'll miss you.`), leftParticipantFbId);
        }
    } catch (error) {
        console.error(error);
    }
};

module.exports["run"] = async ({
    args, chat, font
}) => {
    const mono = txt => font.monospace(txt);
    const command = args.join(" ").trim().toLowerCase();

    if (command === "on" || command === "off") {
        joinNotificationEnabled = command === "on";
        await chat.reply(mono(`Join notifications are now ${joinNotificationEnabled ? "enabled" : "disabled"}`));
    } else {
        await chat.reply(mono("Type 'on' to enable join notifications or 'off' to disable them."));
    }
};