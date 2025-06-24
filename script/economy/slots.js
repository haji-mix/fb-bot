module.exports = {
    config: {
        name: "slot",
        aliases: ["slots", "spin"],
        type: "economy",
        author: "Kenneth Panio | Aljur pogoy",
        role: 0,
        cooldowns: 10,
        description: "Play a slot machine game with all-in option",
        prefix: true
    },
    run: async ({ chat, event, args, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;
            let balance = await Currencies.getBalance(senderID);
            if (balance <= 0) {
                return chat.reply("You don't have enough money to play slots!");
            }
            let bet;
            if (args[0]?.toLowerCase() === "allin") {
                bet = balance;
            } else {
                bet = parseInt(args[0]) || 100;
                if (isNaN(bet) || bet <= 0) {
                    return chat.reply("Please enter a valid bet amount!");
                }
                if (bet > balance) {
                    return chat.reply("You don't have enough money for this bet!");
                }
            }
            const symbols = ['🍒', '🍋', '🍊', '💎', '7️⃣', '🔔'];
            const spin = Array(3).fill().map(() => symbols[Math.floor(Math.random() * symbols.length)]);
            let multiplier = 0;
            if (spin.every(s => s === spin[0])) {
                if (spin[0] === '7️⃣') multiplier = 10;
                else if (spin[0] === '💎') multiplier = 5;
                else multiplier = 3;
            } else if (spin[0] === spin[1] || spin[1] === spin[2] || spin[0] === spin[2]) {
                multiplier = 1.5;
            }
            const winnings = Math.floor(bet * multiplier);
            const newBalance = balance - bet + winnings;
            await Currencies.setBalance(senderID, newBalance);
            const resultText = format({
                title: 'Slot Machine 🎰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `Spin: ${spin.join(' | ')}\n` +
                         `Bet: $${bet.toLocaleString()}\n` +
                         (multiplier > 0 ? 
                            `You won $${winnings.toLocaleString()} (${multiplier}x)!\n` :
                            `No win this time!\n`) +
                         `New balance: $${newBalance.toLocaleString()}`
            });
            chat.reply(resultText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while playing slots. Please try again later.');
        }
    }
};
