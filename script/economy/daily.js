const mocha = require("mocha");

module.exports = {
    config: {
        name: "daily",
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 43200, // 12 hours in seconds
        description: "Claim your daily reward",
        prefix: true
    },
    run: async ({ chat, event, Utils }) => {
        try {
            const { senderID } = event;
            const dailyReward = 1000; 

            await Utils.Currencies.addBalance(senderID, dailyReward);

            chat.reply(`Successfully claimed your daily reward of ${dailyReward} coins!`);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while claiming your daily reward. Please try again later.');
        }
    }
};