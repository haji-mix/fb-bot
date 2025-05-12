module.exports = {
    config: {
        name: "top",
        aliases: ["leaderboard", "richtop"],
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        usage: "[number/limit]",
        guide: "top 10",
        cooldowns: 5,
        description: "Show the top users with the highest balance",
        prefix: true
    },
    run: async ({ chat, args, Utils, format, UNIRedux }) => {
        try {
            const { Currencies } = Utils;
            const topLimit = parseInt(args[0]) || 5; 

            if (isNaN(topLimit) || topLimit < 1 || topLimit > 50) {
                return chat.reply("Please provide a valid number of users (1-50).");
            }

            const leaderboard = await Currencies.getLeaderboard(topLimit);
            if (!leaderboard || leaderboard.length === 0) {
                return chat.reply("No users found in the economy system.");
            }

            for (const entry of leaderboard) {
                const { userId, name } = entry;
                if (!name) {
                    try {
                        const userName = await chat.userName(userId);
                        if (userName && typeof userName === 'string' && userName.trim()) {
                            await Currencies.setName(userId, userName.trim());
                            entry.name = userName.trim();
                        }
                    } catch (error) {
               //         console.warn(`Failed to fetch/store name for user ${userId}: ${error.message}`);
                    }
                }
            }

            let content = "🏆 Top Richest Users 🏆\n\n";
            for (let i = 0; i < leaderboard.length; i++) {
                const { userId, balance, name } = leaderboard[i];
                const displayName = name || `User ${userId}`;
                content += `${i + 1}. ${displayName}: $${balance.toLocaleString()}\n`;
            }

            const formattedText = format({
                title: 'Leaderboard 💰',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: content
            });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while fetching the leaderboard. Please try again later.');
        }
    }
};