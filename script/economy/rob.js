
module.exports = {
    config: {
        name: "rob",
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 60, 
        description: "Attempt to rob money from another user by providing their profile link, UID, mentioning them, or replying to their message",
        usages: "[amount] [targetID/link/mention/reply]",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, api, format, UNIRedux }) => {
        try {
            const { senderID, mentions } = event;
            const robAmount = parseInt(args[0]);
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

            if (!robAmount || isNaN(robAmount) || robAmount <= 0) {
                return chat.reply("Please enter a valid amount to rob.");
            }

            if (!targetID) {
                return chat.reply("Please provide a valid profile link, user ID, mention a user, or reply to a message to rob.");
            }

            if (targetID === senderID) {
                return chat.reply("You cannot rob yourself!");
            }

            const userBalance = await Utils.Currencies.getBalance(senderID);
            const targetBalance = await Utils.Currencies.getBalance(targetID);

            if (targetBalance < robAmount) {
                return chat.reply("The target does not have enough money to rob that amount.");
            }

            if (userBalance < Math.floor(robAmount * 0.1)) {
                return chat.reply("You need at least 10% of the rob amount in money to attempt a robbery.");
            }

            const successChance = Math.random();
            let resultMessage;

            if (successChance < 0.4) {
                await Utils.Currencies.addBalance(senderID, robAmount);
                await Utils.Currencies.removeBalance(targetID, robAmount);
                resultMessage = `Robbery successful! You stole $${robAmount.toLocaleString()} from the user!`;
            } else {
                const penalty = Math.floor(robAmount * 0.1);
                await Utils.Currencies.removeBalance(senderID, penalty);
                resultMessage = `Robbery failed! You were caught and lost $${penalty.toLocaleString()} as a penalty.`;
            }

            const formattedText = format({
                title: 'ROBBERY 💰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: resultMessage,
              });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while attempting to rob. Please try again later.');
        }
    }
};