
module.exports = {
    config: {
        name: "gift",
        aliases: ["donate", "give"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 30,
        description: "Gift money to another user by providing their profile link, UID, mentioning them, or replying to their message",
        usages: "[amount] [targetID/link/mention/reply]",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, api, format, UNIRedux }) => {
        try {
            const { senderID, mentions } = event;
            const giftAmount = parseInt(args[0]);
            let targetID;
            
            const profileLinkRegex = /^(https?:\/\/(www\.|m\.)?facebook\.com\/(profile\.php\?id=\d+|[\w\.]+))$/i;

            if (args[1] && profileLinkRegex.test(args[1])) {
                try {
                    targetID = await api.getUID(args[1]);
                } catch (error) {
                    return chat.reply("Invalid profile link or failed to fetch UID. Please try again.");
                }
            } else if (args[1] && !isNaN(args[1])) {
                targetID = args[1];
            } else if (Object.keys(mentions).length > 0) {
                targetID = Object.keys(mentions)[0];
            } else if (event.type === "message_reply") {
                targetID = event.messageReply.senderID;
            }

            if (!giftAmount || isNaN(giftAmount) || giftAmount <= 0) {
                return chat.reply("Please enter a valid amount to gift.");
            }

            if (!targetID) {
                return chat.reply("Please provide a valid profile link, user ID, mention a user, or reply to a message to gift.");
            }

            if (targetID === senderID) {
                return chat.reply("You cannot gift money to yourself!");
            }

            const userBalance = await Utils.Currencies.getBalance(senderID);

            if (userBalance < giftAmount) {
                return chat.reply("You do not have enough money to gift that amount.");
            }

            await Utils.Currencies.removeBalance(senderID, giftAmount);
            await Utils.Currencies.addBalance(targetID, giftAmount);

            const resultMessage = `Success! You gifted $${giftAmount.toLocaleString()} to the user!`;

            const formattedText = format({
                title: 'GIFT 🎁',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: resultMessage,
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while attempting to gift. Please try again later.');
        }
    }
};