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
            content: "**Developed by**: Aljur Pogoy",
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
            if (!CurrencySystem || typeof CurrencySystem.getBalance !== 'function') {
                throw new Error('CurrencySystem is not properly initialized.');
            }
            const subcommand = args[0]?.toLowerCase();
            let userData = await CurrencySystem.getBalance(senderID);
            if (typeof userData !== 'object') {
            
                userData = { balance: userData, name: null, exp: 0, inventory: {} };
                await CurrencySystem.setName(senderID, userData.name); 
            }

            let balance = userData.balance || 0;
            let exp = userData.exp || 0;
            let level = Math.floor(exp / 100) || 1;
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

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
                    await CurrencySystem.setName(senderID, name);
                    await CurrencySystem.addBalance(senderID, 100); // Starting balance
                    await CurrencySystem.store.put(senderID, {
                        balance: 100,
                        name,
                        exp: 0,
                        inventory: {}
                    });
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
                    await CurrencySystem.addBalance(senderID, earnAmount);
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
                    const enemies = [
                        { name: "Goblin", health: 50, strength: 10, exp: Math.floor(Math.random() * 20) + 20 },
                        { name: "Wolf", health: 70, strength: 15, exp: Math.floor(Math.random() * 30) + 30 },
                        { name: "Troll", health: 100, strength: 20, exp: Math.floor(Math.random() * 40) + 40 }
                    ];
                    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
                    const playerStrength = level * 10; 
                    const battleChance = Math.random() * (playerStrength / (playerStrength + enemy.strength));

                    if (battleChance > 0.3) {
                        userData.exp = (userData.exp || 0) + enemy.exp;
                        await CurrencySystem.store.put(senderID, userData);
                        const battleWinText = format({
                            title: 'Battle 🗡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP. New XP: ${userData.exp}`,
                        });
                        chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: 'Battle 🛡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You were defeated by a ${enemy.name}! Try again later.`,
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
                        title: 'Menu ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `***Available Subcommand(s)***:\n- **rpg** register <name>\n- **rpg** stats\n- **rpg** earn\n- **rpg** level\n- **rpg** battle\n- **rpg** inventory`,
                    });
                    chat.reply(helpText);
            }
        } catch (error) {
            console.error(error);
            chat.reply('An error occurred while processing your RPG command. Please try again later.');
        }
    }
};
