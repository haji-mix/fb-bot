module.exports = {
    config: {
        name: "bank",
        aliases: [],
        type: "economy",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Manage your bank account and transactions",
        usages: "bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]",
        prefix: true
    },
    run: async ({ chat, event, args, format, Utils }) => {
        try {
            if (!Utils.Currencies || typeof Utils.Currencies.getData !== 'function') {
                throw new Error(
                    "Currency system is not initialized. Ensure Utils.Currencies is properly set up with the CurrencySystem instance from currency.js. Contact the bot administrator for assistance."
                );
            }

            const { senderID } = event;
            const subcommand = args[0] ? args[0].toLowerCase() : "";

            if (!subcommand) {
                const formattedText = format({
                    title: 'BANK OPTIONS 🏦',
                    content: "Available:\nwithdraw\ndeposit\nloan\npay\ndonate\ngive"
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "register") {
                const name = args.slice(1).join(" ");
                if (!name) return chat.reply("Please provide a name to register.");
                const userData = await Utils.Currencies.getData(senderID) || {};
                if (userData.registered) return chat.reply("You are already registered.");
                const usernameMap = await Utils.Currencies.getData("bank_usernames") || {};
                if (Object.values(usernameMap).includes(name)) return chat.reply("User name has already registered please try again.");
                userData.registered = true;
                userData.name = name;
                await Utils.Currencies.setData(senderID, userData);
                usernameMap[senderID] = name;
                await Utils.Currencies.setData("bank_usernames", usernameMap);
                const formattedText = format({
                    title: 'BANK REGISTRATION ✅',
                    content: `Successfully registered ${name}!`
                });
                return chat.reply(formattedText);
            }

            const userData = await Utils.Currencies.getData(senderID) || {};
            if (!userData.registered) return chat.reply("Please register first using 'bank register <name>'.");

            if (subcommand === "withdraw") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                await Utils.Currencies.removeBalance(senderID, amount);
                const formattedText = format({
                    title: 'WITHDRAW 💸',
                    content: `Withdrew $${amount.toLocaleString()}! New balance: $${(balance - amount).toLocaleString()}`
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "deposit") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                await Utils.Currencies.addBalance(senderID, amount);
                const balance = await Utils.Currencies.getBalance(senderID);
                const formattedText = format({
                    title: 'DEPOSIT 💰',
                    content: `Deposited $${amount.toLocaleString()}! New balance: $${balance.toLocaleString()}`
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "loan") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount !== 10000) return chat.reply("Loans are only available for $10,000.");
                if (userData.loan > 0) return chat.reply("You already have an active loan.");
                await Utils.Currencies.addBalance(senderID, amount);
                userData.loan = amount;
                await Utils.Currencies.setData(senderID, userData);
                const balance = await Utils.Currencies.getBalance(senderID);
                const formattedText = format({
                    title: 'LOAN 📜',
                    content: `Received a loan of $${amount.toLocaleString()}! New balance: $${balance.toLocaleString()}`
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "pay") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                if (!userData.loan) return chat.reply("You have no loan to pay.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance to pay.");
                if (amount > userData.loan) return chat.reply(`You only owe $${userData.loan.toLocaleString()}.`);
                await Utils.Currencies.removeBalance(senderID, amount);
                userData.loan -= amount;
                if (userData.loan === 0) delete userData.loan;
                await Utils.Currencies.setData(senderID, userData);
                const formattedText = format({
                    title: 'LOAN PAYMENT 💳',
                    content: `Paid $${amount.toLocaleString()} towards your loan! Remaining: $${userData.loan ? userData.loan.toLocaleString() : 0}`
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "donate" || subcommand === "give") {
                const targetID = args[1];
                const amount = parseInt(args[2]);
                if (!targetID || !amount || isNaN(amount) || amount <= 0) return chat.reply("Please provide a valid user UID and positive amount.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                const targetData = await Utils.Currencies.getData(targetID) || {};
                if (!targetData.registered) return chat.reply("The recipient is not registered.");
                await Utils.Currencies.removeBalance(senderID, amount);
                await Utils.Currencies.addBalance(targetID, amount);
                const newBalance = await Utils.Currencies.getBalance(senderID);
                const formattedText = format({
                    title: subcommand.toUpperCase() + ' 💝',
                    content: `Sent $${amount.toLocaleString()} to user ${targetID}! Your new balance: $${newBalance.toLocaleString()}`
                });
                return chat.reply(formattedText);
            }

            const formattedText = format({
                title: 'BANK ERROR ❌',
                content: "Invalid subcommand. Use: bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]"
            });
            chat.reply(formattedText);
        } catch (error) {
            const formattedText = format({
                title: 'BANK ERROR ❌',
                content: error.stack || error.message || "An error occurred while processing your bank request. Please try again later."
            });
            chat.reply(formattedText);
        }
    }
};
