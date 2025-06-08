module.exports = {
    config: {
        name: "bank",
        aliases: ["b", "bn"],
        type: "economy",
        author: "Aljur Pogoy",
        role: 0,
        cooldowns: 5,
        description: "Manage your bank account and transactions",
        usages: "bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;
            const subcommand = args[0] ? args[0].toLowerCase() : "";

            if (!subcommand) {
                const formattedText = format({
                    title: {
                        content: 'Bank Options 🏦',
                        line_bottom: "default",
                        text_font: "bold"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: "Available:\nwithdraw\ndeposit\nloan\npay\ndonate\ngive"
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "register") {
                const name = args.slice(1).join(" ");
                if (!name) return chat.reply("Please provide a name to register.");
                const userData = await Utils.getData(senderID) || {};
                if (userData.registered) return chat.reply("You are already registered.");
                const usernameMap = await Utils.getData("bank_usernames") || {};
                if (Object.values(usernameMap).includes(name)) return chat.reply("User name has already registered please try again.");
                userData.registered = true;
                userData.name = name;
                await Utils.setData(senderID, userData);
                usernameMap[senderID] = name;
                await Utils.setData("bank_usernames", usernameMap);
                const formattedText = format({
                    title: {
                        content: 'BANK REGISTRATION ✅',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Successfully registered ${name}!`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            const userData = await Utils.getData(senderID) || {};
            if (!userData.registered) return chat.reply("Please register first using 'bank register <name>'.");

            if (subcommand === "withdraw") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                const balance = await Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                await Currencies.decreaseBalance(senderID, amount);
                const formattedText = format({
                    title: {
                        content: 'WITHDRAW 💸',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Withdrew $${amount.toLocaleString()}! New balance: $${(balance - amount).toLocaleString()}`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "deposit") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                await Currencies.increaseBalance(senderID, amount);
                const balance = await Currencies.getBalance(senderID);
                const formattedText = format({
                    title: {
                        content: 'DEPOSIT 💰',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Deposited $${amount.toLocaleString()}! New balance: $${balance.toLocaleString()}`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "loan") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount !== 10000) return chat.reply("Loans are only available for $10,000.");
                if (userData.loan > 0) return chat.reply("You already have an active loan.");
                await Currencies.increaseBalance(senderID, amount);
                userData.loan = amount;
                await Utils.setData(senderID, userData);
                const balance = await Currencies.getBalance(senderID);
                const formattedText = format({
                    title: {
                        content: 'LOAN 📜',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Received a loan of $${amount.toLocaleString()}! New balance: $${balance.toLocaleString()}`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "pay") {
                const amount = parseInt(args[1]);
                if (!amount || isNaN(amount) || amount <= 0) return chat.reply("Please enter a valid positive amount.");
                if (!userData.loan) return chat.reply("You have no loan to pay.");
                const balance = await Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance to pay.");
                if (amount > userData.loan) return chat.reply(`You only owe $${userData.loan.toLocaleString()}.`);
                await Currencies.decreaseBalance(senderID, amount);
                userData.loan -= amount;
                if (userData.loan === 0) delete userData.loan;
                await Utils.setData(senderID, userData);
                const formattedText = format({
                    title: {
                        content: 'LOAN PAYMENT 💳',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Paid $${amount.toLocaleString()} towards your loan! Remaining: $${userData.loan ? userData.loan.toLocaleString() : 0}`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            if (subcommand === "donate" || subcommand === "give") {
                const targetID = args[1];
                const amount = parseInt(args[2]);
                if (!targetID || !amount || isNaN(amount) || amount <= 0) return chat.reply("Please provide a valid user UID and positive amount.");
                const balance = await Currencies.getBalance(senderID);
                if (amount > balance) return chat.reply("Insufficient balance.");
                const targetData = await Utils.getData(targetID) || {};
                if (!targetData.registered) return chat.reply("The recipient is not registered.");
                await Currencies.decreaseBalance(senderID, amount);
                await Currencies.increaseBalance(targetID, amount);
                const newBalance = await Currencies.getBalance(senderID);
                const formattedText = format({
                    title: {
                        content: subcommand.toUpperCase() + ' 💝',
                        line_bottom: "default",
                        text_font: "double_struck"
                    },
                    content: {
                        text_font: "fancy",
                        line_bottom_inside_x: "default",
                        content: `Sent $${amount.toLocaleString()} to user ${targetID}! Your new balance: $${newBalance.toLocaleString()}`
                    },
                    footer: {
                        content: "Made with 🤍 by Aljur Pogoy",
                        text_font: "fancy"
                    }
                });
                return chat.reply(formattedText);
            }

            chat.reply("Invalid subcommand. Use: bank [register <name> | withdraw <amount> | deposit <amount> | loan <amount> | pay <amount> | donate <uid> <amount> | give <uid> <amount>]");
        } catch (error) {
            const formattedText = format({
                title: {
                    content: 'BANK ERROR ❌',
                    line_bottom: "default",
                    text_font: "double_struck"
                },
                content: {
                    text_font: "fancy",
                    line_bottom_inside_x: "default",
                    content: error.stack || error.message || "An error occurred while processing your bank request. Please try again later."
                },
                footer: {
                    content: "Made with 🤍 by Aljur Pogoy",
                    text_font: "fancy"
                }
            });
            chat.reply(formattedText);
        }
    }
};
