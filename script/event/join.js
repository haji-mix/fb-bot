let joinNotificationEnabled = true;

module.exports["config"] = {
    name: "joinnoti",
    info: "Enables or disables join notifications for new members joining the group.",
    credits: "Kenneth Panio",
    version: "1.0.0 still beta",
    usage: "[on/off]",
};

module.exports["handleEvent"] = async ({
    event, api, chat, font, admin, prefix
}) => {
    try {
        const mono = txt => font.monospace(txt);

        if (!joinNotificationEnabled) return;

        const getOrdinalSuffix = number => {
            const lastDigit = number % 10;
            const lastTwoDigits = number % 100;
            if (lastDigit === 1 && lastTwoDigits !== 11) return "st";
            if (lastDigit === 2 && lastTwoDigits !== 12) return "nd";
            if (lastDigit === 3 && lastTwoDigits !== 13) return "rd";
            return "th";
        };

        const groupInfo = await chat.threadInfo(event.threadID);
        const {
            logMessageType,
            logMessageData
        } = event;

        if (logMessageType === "log:subscribe") {
            const joinedUserId = logMessageData?.addedParticipants?.[0]?.userFbId;

            if (!joinedUserId) return;

            if (joinedUserId === chat.botID()) {
                chat.reply({
                    attachment: await chat.stream("https://files.catbox.moe/5swmuv.gif")
                });
                await chat.contact(mono(`Bot connected successfully to ${groupInfo?.name || "Group Chat"}\n\nGet started with "HELP" to see more commands.`), chat.botID());
                await chat.nickname(`${font.bold("CHATBOX SYSTEM")} ${mono(`> [${prefix || "No Prefix"}]`)}`, chat.botID());
            } else {
                const name = await chat.userName(joinedUserId);
                const memberCount = groupInfo?.participantIDs?.length || event?.participantIDs?.length;

                const message = memberCount !== undefined && memberCount !== null
                ? `Welcome ${name || "facebook user"} to ${groupInfo?.name || "Our Group"}! You're the ${memberCount}${getOrdinalSuffix(memberCount)} member.`: `Welcome ${name || "facebook user"} to our group! Please enjoy your stay.`;

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

                const name = await chat.userName(leftParticipantFbId);
                const type = event.author === leftParticipantFbId ? "left by itself": "has been kicked by the administrator";
                chat.contact(mono(`Oops! ${name || "facebook user"} ${type}. We'll miss you.`), leftParticipantFbId);
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
            await chat.reply(mono(`Join notifications are now ${joinNotificationEnabled ? "enabled": "disabled"}`));
        } else {
            await chat.reply(mono("Type 'on' to enable join notifications or 'off' to disable them."));
        }
    };