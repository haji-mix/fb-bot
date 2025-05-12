module.exports = {
    config: {
        name: "balance",
        aliases: ["bal"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 5, 
        description: "Check your current balance",
        prefix: true
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const balance = await Currencies.getBalance(senderID);

            const formattedText = format({
                title: 'Balance 💶',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: "You have $" + balance.toLocaleString(),
              });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while checking your balance. Please try again later.');
        }
    }
};