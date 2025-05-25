module.exports = {
    config: {
        name: "slots",
        aliases: ["slot", "spin"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 15,
        description: "Spin a slot machine to win or lose currency based on your bet and matching symbols",
        prefix: true,
        usage: "[bet]",
    },
    run: async ({ chat, event, args, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const bet = parseInt(args[0]);
            if (!bet || bet <= 0) {
                return chat.reply("Please provide a valid positive bet amount (e.g., !slots 100)");
            }

            const balance = await Currencies.getBalance(senderID);
            if (balance < bet) {
                return chat.reply("You don't have enough balance to place this bet!");
            }

            const symbols = ['🍒', '🍋', '🍊', '💰']; 
            const reel1 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel2 = symbols[Math.floor(Math.random() * symbols.length)];
            const reel3 = symbols[Math.floor(Math.random() * symbols.length)];

            let result, newBalance;
            
            if (reel1 === '💰' && reel2 === '💰' && reel3 === '💰') {
                const winnings = bet * 10;
                newBalance = await Currencies.addBalance(senderID, winnings);
                result = `🎰 ${reel1} | ${reel2} | ${reel3}\nJACKPOT!!! 🎉 You win $${winnings.toLocaleString()}!`;
            } 
            else if (reel1 === reel2 && reel2 === reel3) {
                const winnings = bet * 3;
                newBalance = await Currencies.addBalance(senderID, winnings);
                result = `🎰 ${reel1} | ${reel2} | ${reel3}\nThree of a kind! You win $${winnings.toLocaleString()}!`;
            } 

            else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                const winnings = Math.floor(bet * 1.5);
                newBalance = await Currencies.addBalance(senderID, winnings);
                result = `🎰 ${reel1} | ${reel2} | ${reel3}\nTwo matches! You win $${winnings.toLocaleString()}.`;
            } 
  
            else {
                newBalance = await Currencies.removeBalance(senderID, bet);
                result = `🎰 ${reel1} | ${reel2} | ${reel3}\nNo matches... You lost $${bet.toLocaleString()}.`;
            }

            const formattedText = format({
                title: 'Slot Machine 🎰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: `${result}\nYour new balance: $${newBalance.toLocaleString()}`
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while playing the slots game. Please try again later.');
        }
    }
};