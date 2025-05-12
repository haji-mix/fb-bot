const mocha = require("mocha");

module.exports = {
    config: {
        name: "work",
        aliases: ["job"],
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 300, // 5-minute cooldown to prevent spamming
        description: "Work at a virtual job to earn random coins",
        usages: "[job type: office/freelance/factory] (optional)",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, api, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const jobTypes = ["office", "freelance", "factory"];
            let job = args[0] ? args[0].toLowerCase() : jobTypes[Math.floor(Math.random() * jobTypes.length)];

            // Validate job type
            if (!jobTypes.includes(job)) {
                return chat.reply(`Invalid job type. Choose from: ${jobTypes.join(", ")}.`);
            }

            // Check user balance
            const userBalance = await Utils.Currencies.getBalance(senderID);

            // Define job-specific earnings range
            const earningsRange = {
                office: { min: 50, max: 200 },
                freelance: { min: 80, max: 300 },
                factory: { min: 30, max: 150 }
            };

            // Random chance of success (e.g., 80% success rate)
            const successChance = Math.random();
            let resultMessage;

            if (successChance < 0.8) {
                // Success: User earns coins
                const earnings = Math.floor(
                    Math.random() * (earningsRange[job].max - earningsRange[job].min + 1) + earningsRange[job].min
                );
                await Utils.Currencies.addBalance(senderID, earnings);
                resultMessage = `You worked hard at your $${job} job and earned ${earnings} coins!`;
            } else {
                // Failure: No earnings, small penalty
                const penalty = Math.floor(userBalance * 0.05) || 10; // 5% of balance or minimum 10 coins
                await Utils.Currencies.removeBalance(senderID, penalty);
                resultMessage = `Your ${job} job didn't go well today, and you lost $${penalty} coins due to mistakes.`;
            }

            const formattedText = format({
                title: 'WORK 💼',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: resultMessage,
              });


            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while working. Please try again later.');
        }
    }
};