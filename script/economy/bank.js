module.exports = {
    config: {
        name: "bank",
        aliases: ["b"],
        type: "economy",
        author: "Aljur Pogoy",
        role: 0",
        cooldowns: 5,
        description: "Manage your bank account and transactions",
        usages: "bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]",
        prefix: true
    },
    run: async ({ chat, event, args, format, Utils }) => {
        try {
            if (!Utils.Currencies || typeof Utils.Currencies.getData !== 'function') {
                throw new Error("Currency system not initialized. Ensure Utils.Currencies is set with CurrencySystem.");
            }

            const { senderID } = event;
            const subcommand = args[0] ? args[0].toLowerCase() : "";

            if (!subcommand) {
                return chat.reply(format({
                    title: 'BANK OPTIONS 🏦',
                    content: "Available:\nwithdraw\ndeposit\nloan\npay\ndonate\ngive"
                }));
            }

            if (subcommand === "register") {
                const name = args.slice(1).join(" ");
                if (!name) return chat.reply("Please provide a name to register.");
                const userData = await Utils.Currencies.getData(senderID) || {};
                if (userData.registered) return chat.reply("You are already registered.");
                const usernameMap = await Utils.Currencies.getData("bank_usernames") || {};
                if (Object.values(usernameMap).includes(name)) return chat.reply("Username already taken. Try another.");
                const updatedUserData = { ...userData, registered: true, name };
                await Utils.Currencies.setData(senderID, updatedUserData);
                console.log(`[BANK DEBUG] Registered user ${senderID}:`, updatedUserData);
                await Utils.Currencies.setData("bank_usernames", { ...usernameMap, [senderID]: name });
                console.log(`[BANK DEBUG] Updated usernames:`, { ...usernameMap, [senderID]: name });
                return chat.reply(format({
                    title: 'BANK REGISTRATION ✅',
                    content: `Successfully registered ${name}!`
                }));
            }

            const userData = await Utils.Currencies.getData(senderID) || {};
            console.log(`[BANK DEBUG] User data for ${senderID}:`, userData);
            if (!userData.registered) return chat.reply("Please register first using 'bank register <name>'.");

            if (subcommand === "withdraw") {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) return chat.reply("Enter a valid positive amount.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                await Utils.Currencies.removeBalance(senderID, amount);
                return chat.reply(format({
                    title: 'WITHDRAW 💸',
                    content: `Withdrew $${amount.toLocaleString()}. New balance: $${(balance - amount).toLocaleString()}`
                }));
            }

            if (subcommand === "deposit") {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) return chat.reply("Enter a valid positive amount.");
                await Utils.Currencies.addBalance(senderID, amount);
                const balance = await Utils.Currencies.getBalance(senderID);
                return chat.reply(format({
                    title: 'DEPOSIT 💰',
                    content: `Deposited $${amount.toLocaleString()}. New balance: $${balance.toLocaleString()}`
                }));
            }

            if (subcommand === "loan") {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount !== 10000) return chat.reply("Loans are only available for $10,000.");
                if (userData.loan > 0) return chat.reply("You already have an active loan.");
                await Utils.Currencies.addBalance(senderID, amount);
                await Utils.Currencies.setData(senderID, { ...userData, loan: amount });
                const balance = await Utils.Currencies.getBalance(senderID);
                return chat.reply(format({
                    title: 'LOAN 📜',
                    content: `Received a $10,000 loan. New balance: $${balance.toLocaleString()}`
                }));
            }

            if (subcommand === "pay") {
                const amount = parseInt(args[1]);
                if (isNaN(amount) || amount <= 0) return chat.reply("Enter a valid positive amount.");
                if (!userData.loan) return chat.reply("You have no loan to pay.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                if (amount > userData.loan) return chat.reply(`You only owe $${userData.loan.toLocaleString()}.`);
                await Utils.Currencies.removeBalance(senderID, amount);
                const newLoan = userData.loan - amount;
                await Utils.Currencies.setData(senderID, { ...userData, loan: newLoan > 0 ? newLoan : undefined });
                return chat.reply(format({
                    title: 'LOAN PAYMENT 💳',
                    content: `Paid $${amount.toLocaleString()} towards your loan. Remaining: $${newLoan > 0 ? newLoan.toLocaleString() : 0}`
                }));
            }

            if (subcommand === "donate" || subcommand === "give") {
                const targetID = args[1];
                const amount = parseInt(args[2]);
                if (!targetID || isNaN(amount) || amount <= 0) return chat.reply("Provide a valid user ID and amount.");
                const balance = await Utils.Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                const targetData = await Utils.Currencies.getData(targetID) || {};
                if (!targetData.registered) return chat.reply("Recipient is not registered.");
                await Utils.Currencies.removeBalance(senderID, amount);
                await Utils.Currencies.addBalance(targetID, amount);
                const newBalance = await Utils.Currencies.getBalance(senderID);
                return chat.reply(format({
                    title: `${subcommand.toUpperCase()} 💝`,
                    content: `Sent $${amount.toLocaleString()} to user ${targetID}. New balance: $${newBalance.toLocaleString()}`
                }));
            }

            return chat.reply(format({
                title: 'BANK ERROR ❌',
                content: "Invalid subcommand. Use: bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]"
            }));
        } catch (error) {
            return chat.reply(format({
                title: 'BANK ERROR ❌',
                content: error.message || "An error occurred. Please try again later."
            }));
        }
    }
};
