const mocha = require("mocha");

module.exports = {
    config: {
        name: "daily",
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 43200, 
        description: "Claim your daily reward",
        prefix: true
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const dailyReward = 1000; 

            await Utils.Currencies.addBalance(senderID, dailyReward);

            const formattedText = format({
                title: 'DAILY REWARD 💰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Successfully claimed your daily reward of $${dailyReward.toLocaleString()} !`,
              });


            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while claiming your daily reward. Please try again later.');
        }
    }
};