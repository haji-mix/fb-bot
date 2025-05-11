const mocha = require("mocha");

module.exports = {
    config: {
        name: "rob",
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 60, // Longer cooldown to prevent spamming
        description: "Attempt to rob coins from another user by providing their profile link, UID, mentioning them, or replying to their message",
        usages: "[amount] [targetID/link/mention/reply]"
        prefix: true
    },
    run: async ({ chat, event, Utils, args, api }) => {
        try {
            const { senderID, mentions } = event;
            const robAmount = parseInt(args[0]);
            let targetID;

            // Regex to validate Facebook profile links
            const profileLinkRegex = /^(https?:\/\/(www\.|m\.)?facebook\.com\/(profile\.php\?id=\d+|[\w\.]+))$/i;

            // Determine targetID: profile link, UID, mention, or message reply
            if (args[1] && profileLinkRegex.test(args[1])) {
                // Profile link provided
                try {
                    targetID = await api.getUID(args[1]);
                } catch (error) {
                    return chat.reply("Invalid profile link or failed to fetch UID. Please try again.");
                }
            } else if (args[1] && !isNaN(args[1])) {
                // Direct UID provided
                targetID = args[1];
            } else if (Object.keys(mentions).length > 0) {
                // Mention provided
                targetID = Object.keys(mentions)[0];
            } else if (event.type === "message_reply") {
                // Message reply
                targetID = event.messageReply.senderID;
            }

            // Validation checks
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
                return chat.reply("The target does not have enough coins to rob that amount.");
            }

            if (userBalance < Math.floor(robAmount * 0.1)) {
                return chat.reply("You need at least 10% of the rob amount in coins to attempt a robbery.");
            }

            // Random chance of success (e.g., 40% success rate)
            const successChance = Math.random();
            let resultMessage;

            if (successChance < 0.4) {
                // Success: Robber gains coins, target loses coins
                await Utils.Currencies.addBalance(senderID, robAmount);
                await Utils.Currencies.removeBalance(targetID, robAmount);
                resultMessage = `Robbery successful! You stole ${robAmount} coins from the user!`;
            } else {
                // Failure: Robber loses a small penalty
                const penalty = Math.floor(robAmount * 0.1);
                await Utils.Currencies.removeBalance(senderID, penalty);
                resultMessage = `Robbery failed! You were caught and lost ${penalty} coins as a penalty.`;
            }

            chat.reply(resultMessage);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while attempting to rob. Please try again later.');
        }
    }
};