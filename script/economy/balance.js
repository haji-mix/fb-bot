module.exports = {
    config: {
        name: "balance",
        aliases: ["bal"],
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 5, 
        description: "Check your current balance",
        prefix: true
    },
    run: async ({ chat, event, Utils }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const balance = await Currencies.getBalance(senderID);

            chat.reply(`Your current balance is ${balance} coins.`);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while checking your balance. Please try again later.');
        }
    }
};