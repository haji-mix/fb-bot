module.exports = {
    config: {
        name: "slots",
        aliases: ["slot", "spin", "scatter"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara | Enhanced by Grok",
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
            if (!bet || bet <= 0 || isNaN(bet)) {
                return chat.reply("Please provide a valid positive bet amount (e.g., !slots 100)");
            }

            const balance = await Currencies.getBalance(senderID);
            if (balance < bet) {
                return chat.reply("You don't have enough balance to place this bet!");
            }

            const symbols = [
                { icon: '🍒', weight: 40 }, // Common
                { icon: '🍋', weight: 30 }, // Common
                { icon: '🍊', weight: 20 }, // Less common
                { icon: '💰', weight: 5 },  // Rare (jackpot)
                { icon: '❌', weight: 5 }   // Rare (loser)
            ];

            const totalWeight = symbols.reduce((sum, sym) => sum + sym.weight, 0);

            const getRandomSymbol = () => {
                const rand = Math.random() * totalWeight;
                let currentWeight = 0;
                for (const sym of symbols) {
                    currentWeight += sym.weight;
                    if (rand <= currentWeight) return sym.icon;
                }
                return symbols[0].icon; 
            };


            const reel1 = getRandomSymbol();
            const reel2 = getRandomSymbol();
            const reel3 = getRandomSymbol();

            const payoutTable = {
                '💰💰💰': 100,  // Jackpot: 100x
                '🍒🍒🍒': 5,    // Three cherries: 5x
                '🍋🍋🍋': 4,     // Three lemons: 4x
                '🍊🍊🍊': 3,     // Three oranges: 3x
                '❌❌❌': 0,      // Three X's: lose
                'two_match': 1.5 // Any two matching symbols: 1.5x
            };

            let result, newBalance;
            const combination = `${reel1}${reel2}${reel3}`;

            if (reel1 === reel2 && reel2 === reel3) {
                const multiplier = payoutTable[combination] || 0;
                const winnings = Math.floor(bet * multiplier);
                newBalance = await Currencies.addBalance(senderID, winnings - bet);
                if (multiplier > 0) {
                    result = `${reel1} | ${reel2} | ${reel3}\n${multiplier === 100 ? 'JACKPOT!!! 🎉' : 'Three of a kind!'} You win $${winnings.toLocaleString()}!`;
                } else {
                    result = `${reel1} | ${reel2} | ${reel3}\nNo luck... You lost $${bet.toLocaleString()}.`;
                }
            }

            else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                const winnings = Math.floor(bet * payoutTable['two_match']);
                newBalance = await Currencies.addBalance(senderID, winnings - bet);
                result = `${reel1} | ${reel2} | ${reel3}\nTwo matches! You win $${winnings.toLocaleString()}.`;
            }

            else {
                newBalance = await Currencies.removeBalance(senderID, bet);
                result = `${reel1} | ${reel2} | ${reel3}\nNo matches... You lost $${bet.toLocaleString()}.`;
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