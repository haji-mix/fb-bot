module.exports = {
    config: {
        name: "hesoyam",
        type: "cheats",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 10,
        description: "Claim a massive currency boost with the HESOYAM cheat code!",
        prefix: true
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const cheatReward = 250000; // Large reward, inspired by GTA's HESOYAM cheat

            await Utils.Currencies.addBalance(senderID, cheatReward);

            const formattedText = format({
                title: 'HESOYAM CHEAT ACTIVATED 💸',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `You’ve activated the HESOYAM cheat! $${cheatReward.toLocaleString()} has been added to your balance!`,
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while activating the HESOYAM cheat. Please try again later.');
        }
    }
};