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
                { icon: '🍒', weight: 30 }, // Common
                { icon: '🍋', weight: 25 }, // Common
                { icon: '🍊', weight: 20 }, // Common
                { icon: '🍉', weight: 15 }, // Less common
                { icon: '🔔', weight: 10 }, // Less common
                { icon: '💰', weight: 3 },  // Rare (jackpot)
                { icon: '❌', weight: 7 }   // Common (loser)
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
                '💰💰💰': 50,   // Jackpot: 50x (reduced for balance)
                '🍒🍒🍒': 4,    // Three cherries: 4x
                '🍋🍋🍋': 3.5,  // Three lemons: 3.5x
                '🍊🍊🍊': 3,    // Three oranges: 3x
                '🍉🍉🍉': 2.5,  // Three watermelons: 2.5x
                '🔔🔔🔔': 2,    // Three bells: 2x
                '❌❌❌': 0,     // Three X's: lose
                'two_match': 0.8 // Two matching symbols: 0.8x (return less than bet)
            };

            let result, newBalance;
            const combination = `${reel1}${reel2}${reel3}`;

            if (reel1 === reel2 && reel2 === reel3) {
                const multiplier = payoutTable[combination] || 0;
                const winnings = Math.floor(bet * multiplier);
                newBalance = await Currencies.addBalance(senderID, winnings - bet);
                if (multiplier > 0) {
                    result = `${reel1} | ${reel2} | ${reel3}\n${multiplier === 50 ? 'JACKPOT!!! 🎉' : 'Three of a kind!'} You win $${winnings.toLocaleString()}!`;
                } else {
                    result = `${reel1} | ${reel2} | ${reel3}\nNo luck... You lost $${bet.toLocaleString()}.`;
                }
            } else if (reel1 === reel2 || reel2 === reel3 || reel1 === reel3) {
                const winnings = Math.floor(bet * payoutTable['two_match']);
                newBalance = await Currencies.addBalance(senderID, winnings - bet);
                result = `${reel1} | ${reel2} | ${reel3}\nTwo matches! You win $${winnings.toLocaleString()}.`;
            } else {
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