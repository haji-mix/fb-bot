module.exports = {
    config: {
        name: "coinflip",
        aliases: ["flip", "coin"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 8,
        description: "Flip a coin to win or lose currency based on your bet and choice (heads or tails)",
        prefix: true,
        usage: "[bet] [heads/tails]",
    },
    run: async ({ chat, event, args, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const bet = parseInt(args[0]);
            const choice = args[1] ? args[1].toLowerCase() : null;

            if (!bet || bet <= 0) {
                return chat.reply("Please provide a valid positive bet amount (e.g., !coinflip 100 heads)");
            }
            if (!choice || !['heads', 'tails'].includes(choice)) {
                return chat.reply("Please specify 'heads' or 'tails' (e.g., !coinflip 100 heads)");
            }

            const balance = await Currencies.getBalance(senderID);
            if (balance < bet) {
                return chat.reply("You don't have enough balance to place this bet!");
            }

            const result = Math.random() < 0.5 ? 'heads' : 'tails';
            let outcome, newBalance;

            if (result === choice) {
                const winnings = bet * 2;
                newBalance = await Currencies.addBalance(senderID, winnings);
                outcome = `🪙 The coin landed on **${result}**! You win $${winnings.toLocaleString()}!`;
            } else {
                newBalance = await Currencies.removeBalance(senderID, bet);
                outcome = `🪙 The coin landed on **${result}**... You lost $${bet.toLocaleString()}.`;
            }


            const formattedText = format({
                title: 'Coin Flip 🪙',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `${outcome}\nYour new balance: $${newBalance.toLocaleString()}`
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while playing the coin flip game. Please try again later.');
        }
    }
};