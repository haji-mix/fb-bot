module.exports = {
    config: {
        name: "ddakji",
        aliases: ["squidddakji", "flipgame", "ddakjichallenge", "dkj", "dakji", "ttakjj", "tkj", "takji"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 15,
        description: "Play a high-stakes Ddakji game inspired by Squid Game! Flip the opponent's tile to win money, or lose money if you fail!",
        prefix: true
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const baseReward = 1000; // Base reward for a win (like surviving a round in Squid Game)
            const basePenalty = 500; // Base penalty for a loss (like a slap in Squid Game)
            const multiplierIncrement = 0.5; // Multiplier increases by 0.5 per win/loss (1x, 1.5x, 2x, etc.)

            // In-memory streak tracking (replace with database for persistence)
            let playerData = global.playerData || {};
            if (!playerData[senderID]) {
                playerData[senderID] = { winStreak: 0, lossStreak: 0, lastPlayed: 0 };
            }
            global.playerData = playerData;

            // Simulate Ddakji game (50% chance to flip, mimicking the skill/luck balance in Squid Game)
            const flipSuccess = Math.random() > 0.5;
            let message = "🟥 ➡️ 🟦\nYou throw your tile against the opponent's tile...\n";

            if (flipSuccess) {
                // Handle success - Player's 🟥 flips the opponent's 🟦, showing 🔷 as flipped result
                playerData[senderID].winStreak += 1;
                playerData[senderID].lossStreak = 0; // Reset loss streak
                const multiplier = 1 + (playerData[senderID].winStreak - 1) * multiplierIncrement;
                const reward = Math.floor(baseReward * multiplier);
                await Utils.Currencies.addBalance(senderID, reward);
                message += `🎉 Your 🟥 flipped the opponent's 🟦 into 🔷! You survived this round and won **$${reward.toLocaleString()} ** (x${multiplier} multiplier).\nWin Streak: ${playerData[senderID].winStreak}`;
            } else {
                // Handle failure - Player's 🟥 fails, opponent's 🟦 stays as ♦️ to indicate loss
                playerData[senderID].lossStreak += 1;
                playerData[senderID].winStreak = 0; // Reset win streak
                const multiplier = 1 + (playerData[senderID].lossStreak - 1) * multiplierIncrement;
                const penalty = Math.floor(basePenalty * multiplier);

                // Check if player has enough balance (like having enough to survive the penalty in Squid Game)
                const currentBalance = await Utils.Currencies.getBalance(senderID);
                if (currentBalance >= penalty) {
                    await Utils.Currencies.removeBalance(senderID, penalty);
                    message += `😣 Your 🟥 failed to flip the opponent's 🟦, revealing ♦️! You took a hit and lost **$${penalty.toLocaleString()} ** (x${multiplier} multiplier).\nLoss Streak: ${playerData[senderID].lossStreak}`;
                } else {
                    message += `😣 Your 🟥 failed to flip the opponent's 🟦, revealing ♦️! You would have lost **$${penalty.toLocaleString()} **, but you're broke ($${currentBalance.toLocaleString()} coins).\nLoss Streak: ${playerData[senderID].lossStreak}`;
                }
            }

            // Update last played time
            playerData[senderID].lastPlayed = Date.now();

            const formattedText = format({
                title: 'DDAKJI 🟥🟦',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: message,
              });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || '❌ An error occurred during the Ddakji challenge. Try again later.');
        }
    }
};