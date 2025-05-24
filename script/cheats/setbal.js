module.exports = {
    config: {
        name: "setbal",
        aliases: ["setbalance"],
        type: "admin",
        author: "Kenneth Panio",
        role: 1,
        cooldowns: 5,
        description: "Set a user's currency balance by providing their profile link, UID, mentioning them, or replying to their message (Admin only)",
        usages: "[amount] [targetID/link/mention/reply]",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, api, format, UNIRedux }) => {
        try {
            const { senderID, mentions } = event;
            const amount = parseInt(args[0]);
            let targetID = senderID;
            let targetName = "your";

            const profileLinkRegex = /^(https?:\/\/(www\.|m\.)?facebook\.com\/(profile\.php\?id=\d+|[\w\.]+))$/i;

            if (args[1] && profileLinkRegex.test(args[1])) {
                try {
                    targetID = await api.getUID(args[1]);
                    targetName = "the user's";
                } catch (error) {
                    return chat.reply("Invalid profile link or failed to fetch UID. Please try again.");
                }
            } else if (args[1] && !isNaN(args[1])) {
                targetID = args[1];
                targetName = "the user's";
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
                targetName = mentions[targetID];
            } else if (event.type === "message_reply") {
                targetID = event.messageReply.senderID;
                targetName = "the user's";
            }

            if (!amount || isNaN(amount) || amount < 0) {
                return chat.reply("Please enter a valid positive number for the balance.");
            }

            await Utils.Currencies.setBalance(targetID, amount);

            const formattedText = format({
                title: 'BALANCE SET 💰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Successfully set ${targetName} balance to $${amount.toLocaleString()}!`,
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while setting the balance. Please try again later.');
        }
    }
};