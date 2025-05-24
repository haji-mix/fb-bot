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
        description: "Show the top users with the highest balance (excluding admins)",
        prefix: true
    },
    run: async ({ chat, args, Utils, format, UNIRedux, admin }) => {
        try {
            const { Currencies } = Utils;
            const topLimit = parseInt(args[0]) || 5;

            if (isNaN(topLimit) || topLimit < 1 || topLimit > 10) {
                return chat.reply("Please provide a valid number of users (1-10).");
            }

            let leaderboard = await Currencies.getLeaderboard(topLimit + admin.length); 
            if (!leaderboard || leaderboard.length === 0) {
                return chat.reply("No users found in the economy system.");
            }

            leaderboard = leaderboard.filter(entry => !admin.includes(String(entry.userId)));
            leaderboard = leaderboard.slice(0, topLimit); 

            if (leaderboard.length === 0) {
                return chat.reply("No non-admin users found in the economy system.");
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