module.exports = {
    config: {
        name: "rpg",
        aliases: ["rp"],
        type: "economy",
        author: "Kenneth Panio | Aljur Pogoy",
        role: 0,
        cooldowns: 10,
        description: "Manage your RPG character and economy",
        prefix: true,
        usage: "<command> [arguments]"
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 ⚔️ 〙 RPG",
            line_bottom: "default",
        },
        footer: {
            content: "**Developed by**: Aljur Pogoy",
            contentFont: "fancy",
        },
        titleFont: "bold",
        contentFont: "fancy",
    },
    run: async ({ chat, event, Utils, format, UNIRedux, args }) => {
        const footer = format(module.exports.config.style.footer);
        
        try {
            const { senderID } = event;
            const { Currencies } = Utils;

            const [subcommand, ...restArgs] = args.map(arg => arg?.toLowerCase().trim());
            const commandArgs = restArgs.join(" ").trim();

            let userData = await Currencies.getData(senderID);
            let balance = userData.balance || 0;
            let exp = userData.exp || 0;
            let level = Math.floor(exp / 100) || 1;
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            const validateCommand = (expectedArgs, usageExample) => {
                if (restArgs.length < expectedArgs) {
                    const errorText = format({
                        title: 'Usage ❌',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Incorrect usage! Example: ${usageExample}\n\n${footer}`,
                    });
                    chat.reply(errorText);
                    return false;
                }
                return true;
            };

            if (subcommand !== "register" && !playerName) {
                const notRegisteredText = format({
                    title: 'Register 🚫',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: rpg register <name>\n\n${footer}`,
                });
                return chat.reply(notRegisteredText);
            }

            switch (subcommand) {
                case "register":
                    if (playerName) {
                        const alreadyRegisteredText = format({
                            title: 'Register 📝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are already registered as ${playerName}!\n\n${footer}`,
                        });
                        return chat.reply(alreadyRegisteredText);
                    }
                    
                    if (!validateCommand(1, "rpg register <your_name>")) return;
                    
                    const name = commandArgs;
                    if (!name || name.length > 20) {
                        const invalidNameText = format({
                            title: 'Register 🚫',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid name! Must be 1-20 characters.\nUsage: rpg register <name>\n\n${footer}`,
                        });
                        return chat.reply(invalidNameText);
                    }
                    
                    await Currencies.setData(senderID, { 
                        name, 
                        balance: 100, 
                        exp: 0, 
                        inventory: {} 
                    });
                    
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You've registered as a new adventurer with $100.\n\n${footer}`,
                    });
                    chat.reply(registerText);
                    break;

                case "stats":
                    const statsText = format({
                        title: 'Stats 📊',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${balance.toLocaleString()}\n\n${footer}`,
                    });
                    chat.reply(statsText);
                    break;

                case "earn":
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    await Currencies.increaseMoney(senderID, earnAmount);
                    const earnText = format({
                        title: 'Earn 💰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You earned $${earnAmount.toLocaleString()} from your adventure! New balance: $${(balance + earnAmount).toLocaleString()}\n\n${footer}`,
                    });
                    chat.reply(earnText);
                    break;

                case "level":
                    const requiredExp = level * 100;
                    const levelText = format({
                        title: 'Level 📈',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Level: ${level}\nExperience: ${exp} XP\nRequired for next level: ${requiredExp - exp} XP\n\n${footer}`,
                    });
                    chat.reply(levelText);
                    break;

                case "battle":
                    const enemies = [
                        { name: "Goblin", health: 50, strength: 10, exp: Math.floor(Math.random() * 20) + 20, loot: "Health Potion" },
                        { name: "Wolf", health: 70, strength: 15, exp: Math.floor(Math.random() * 30) + 30, loot: "Wolf Pelt" },
                        { name: "Troll", health: 100, strength: 20, exp: Math.floor(Math.random() * 40) + 40, loot: "Troll Club" }
                    ];
                    const enemy = enemies[Math.floor(Math.random() * enemies.length)];

                    let itemId;
                    try {
                        itemId = await Currencies._resolveItemId(enemy.loot);
                    } catch (error) {
                        await Currencies.createItem({
                            name: enemy.loot,
                            price: 50, 
                            description: `A ${enemy.loot.toLowerCase()} obtained from defeating a ${enemy.name}`,
                            category: "battle_loot",
                        });
                        itemId = await Currencies._resolveItemId(enemy.loot);
                    }

                    const playerStrength = level * 10;
                    const battleChance = Math.random() * (playerStrength / (playerStrength + enemy.strength));
                    if (battleChance > 0.3) {
                        await Currencies.increaseExp(senderID, enemy.exp);
                        await Currencies.addItem(senderID, itemId, 1);
                        const battleWinText = format({
                            title: 'Battle 🗡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${exp + enemy.exp}\n\n${footer}`,
                        });
                        chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: 'Battle 🛡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You were defeated by a ${enemy.name}! Try again later.\n\n${footer}`,
                        });
                        chat.reply(battleLoseText);
                    }
                    break;

                case "inventory":
                case "inv":
                    const inventoryItems = [];
                    for (const [itemId, data] of Object.entries(inventory)) {
                        try {
                            const item = await Currencies.getItem(itemId);
                            inventoryItems.push(`${item.name}: ${data.quantity}`);
                        } catch (error) {
                            inventoryItems.push(`Unknown Item (ID: ${itemId}): ${data.quantity}`);
                        }
                    }
                    const inventoryText = format({
                        title: 'Inventory 🎒',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\n` +
                                 (inventoryItems.length > 0
                                     ? `Items: ${inventoryItems.join(", ")}`
                                     : "Your inventory is empty!") + `\n\n${footer}`,
                    });
                    chat.reply(inventoryText);
                    break;

                case "help":
                case undefined:
                    const helpText = format({
                        title: 'Menu ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Available commands:\n` +
                                `- rpg register <name> - Register your character\n` +
                                `- rpg stats - View your character stats\n` +
                                `- rpg earn - Earn money from adventures\n` +
                                `- rpg level - Check your level progress\n` +
                                `- rpg battle - Fight enemies for XP and loot\n` +
                                `- rpg inventory - View your collected items\n\n${footer}`,
                    });
                    chat.reply(helpText);
                    break;

                default:
                    const unknownCommandText = format({
                        title: 'Error ❌',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Unknown command: ${subcommand}\nUse "rpg help" for available commands.\n\n${footer}`,
                    });
                    chat.reply(unknownCommandText);
            }
        } catch (error) {
            console.error("RPG Error:", error);
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: "An unexpected error occurred. Please try again later.\n\n" + footer,
            });
            chat.reply(errorText);
        }
    }
};