module.exports = {
    config: {
        name: "dice",
        aliases: ["roll"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 10,
        description: "Roll two dice to win or lose currency based on your bet",
        prefix: true
    },
    run: async ({ chat, event, args, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const bet = parseInt(args[0]);
            if (!bet || bet <= 0) {
                return chat.reply("Please provide a valid positive bet amount (e.g., !dice 100)");
            }

            const balance = await Currencies.getBalance(senderID);
            if (balance < bet) {
                return chat.reply("You don't have enough balance to place this bet!");
            }

            const die1 = Math.floor(Math.random() * 6) + 1;
            const die2 = Math.floor(Math.random() * 6) + 1;
            const total = die1 + die2;

            let result, newBalance;
            if (total >= 9) {
                const winnings = bet * 2;
                newBalance = await Currencies.addBalance(senderID, winnings);
                result = `🎲 You rolled ${die1} + ${die2} = ${total}! You win $${winnings.toLocaleString()}!`;
            } else if (total >= 5) {
                const winnings = Math.floor(bet * 0.5);
                newBalance = await Currencies.addBalance(senderID, winnings);
                result = `🎲 You rolled ${die1} + ${die2} = ${total}. You win $${winnings.toLocaleString()}.`;
            } else {
                newBalance = await Currencies.removeBalance(senderID, bet);
                result = `🎲 You rolled ${die1} + ${die2} = ${total}... You lost $${bet.toLocaleString()}.`;
            }

            const formattedText = format({
                title: 'Dice Roll 🎲',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `${result}\nYour new balance: $${newBalance.toLocaleString()}`
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while playing the dice game. Please try again later.');
        }
    }
};