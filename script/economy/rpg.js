
module.exports = {
    config: {
        name: "rpg",
        aliases: ["rp"],
        type: "economy",
        author: "Kenneth Panio | Aljur pogoy",
        role: 0,
        cooldowns: 10,
        description: "Manage your RPG character and economy",
        prefix: true
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 ⚔️ 〙 RPG",
            line_bottom: "default",
        },
        footer: {
            content: "**Developed by**: Aljur pogoy",
            text_font: "fancy",
        },
        titleFont: "bold",
        contentFont: "fancy",
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { CurrencySystem } = Utils;
            const args = event.body?.split(" ").slice(1) || [];

            const subcommand = args[0]?.toLowerCase();

            let userData = await Currencies.getData(senderID) || {};
            let balance = userData.balance || 0;
            let exp = userData.exp || 0;
            let level = Math.floor(exp / 100) || 1;
            let inventory = userData.inventory || {};
            let playerName = userData.playerName || null;

            if (subcommand !== "register" && !playerName) {
                const notRegisteredText = format({
                    title: 'Register 🚫',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: rpg register <name>`,
                });
                return chat.reply(notRegisteredText);
            }

            switch (subcommand) {
                case "register":
                    if (playerName) {
                        const alreadyRegisteredText = format({
                            title: 'Register 📝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are already registered as ${playerName}!`,
                        });
                        return chat.reply(alreadyRegisteredText);
                    }
                    const name = args.slice(1).join(" ").trim();
                    if (!name) {
                        const noNameText = format({
                            title: 'Register 🚫',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Please provide a name! Usage: rpg register <name>`,
                        });
                        return chat.reply(noNameText);
                    }
                    await Currencies.setData(senderID, { playerName: name, balance: 100, exp: 0, inventory: {} });
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You’ve registered as a new adventurer with $100.`,
                    });
                    chat.reply(registerText);
                    break;

                case "stats":
                    const statsText = format({
                        title: 'Stats 📊',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${balance.toLocaleString()}`,
                    });
                    chat.reply(statsText);
                    break;

                case "earn":
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    await Currencies.increaseMoney(senderID, earnAmount);
                    const earnText = format({
                        title: 'Earn 💰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You earned $${earnAmount.toLocaleString()} from your adventure! New balance: $${(balance + earnAmount).toLocaleString()}`,
                    });
                    chat.reply(earnText);
                    break;

                case "level":
                    const requiredExp = level * 100;
                    const levelText = format({
                        title: 'Level 📈',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Level: ${level}\nExperience: ${exp} XP\nRequired for next level: ${requiredExp - exp} XP`,
                    });
                    chat.reply(levelText);
                    break;

                case "battle":
                    const enemyExp = Math.floor(Math.random() * 30) + 20;
                    const battleChance = Math.random();
                    if (battleChance > 0.3) {
                        await Currencies.increaseExp(senderID, enemyExp);
                        const battleWinText = format({
                            title: 'Battle 🗡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You defeated an enemy! Gained ${enemyExp} XP. New XP: ${(exp + enemyExp)}`,
                        });
                        chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: 'Battle 🛡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You lost the battle! Try again later.`,
                        });
                        chat.reply(battleLoseText);
                    }
                    break;

                case "inventory":
                    const inventoryText = format({
                        title: 'Inventory 🎒',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\n` + 
                                 (Object.keys(inventory).length > 0
                                     ? `Items: ${Object.entries(inventory).map(([item, qty]) => `${item}: ${qty}`).join(", ")}`
                                     : "Your inventory is empty!"),
                    });
                    chat.reply(inventoryText);
                    break;

                default:
                    const helpText = format({
                        title: 'Help ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Available commands:\n- rpg register <name>\n- rpg stats\n- rpg earn\n- rpg level\n- rpg battle\n- rpg inventory`,
                    });
                    chat.reply(helpText);
            }
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while processing your RPG command. Please try again later.');
        }
    }
};
