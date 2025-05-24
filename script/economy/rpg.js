const { CurrencySystem } = require("./currencySystem");

module.exports = {
    config: {
        name: "rpg",
        aliases: ["rp"],
        type: "economy",
        author: "Kenneth Panio | Aljur Pogoy",
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
            const { Currencies } = Utils;
            if (!(Currencies instanceof CurrencySystem)) {
                throw new Error('Currencies is not an instance of CurrencySystem.');
            }
            const args = event.body?.split(" ").slice(1) || [];
            const subcommand = args[0]?.toLowerCase();
            let userData = await Currencies.getData(senderID);
            let playerName = userData.name || null;

            if (Currencies.useItemCollection) {
                const defaultItems = [
                    { name: "Health Potion", price: 50, description: "Restores health" },
                    { name: "Wolf Pelt", price: 30, description: "Crafting material" },
                    { name: "Troll Club", price: 100, description: "Heavy weapon" }
                ];
                for (const item of defaultItems) {
                    try {
                        await Currencies.findItem(item.name);
                    } catch (error) {
                        if (error.message.includes("No items found")) {
                            await Currencies.createItem(item);
                        }
                    }
                }
            }

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
                    await Currencies.setData(senderID, { name, balance: 100, exp: 0, inventory: {} });
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You’ve registered as a new adventurer with $100.`,
                    });
                    chat.reply(registerText);
                    break;

                case "stats":
                    const { balance, exp } = userData;
                    const level = Math.floor(exp / 100) || 1;
                    const statsText = format({
                        title: 'Stats 📊',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${balance.toLocaleString()}`,
                    });
                    chat.reply(statsText);
                    break;

                case "earn":
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    const newBalance = await Currencies.addBalance(senderID, earnAmount);
                    const earnText = format({
                        title: 'Earn 💰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You earned $${earnAmount.toLocaleString()} from your adventure! New balance: $${newBalance.toLocaleString()}`,
                    });
                    chat.reply(earnText);
                    break;

                case "level":
                    const { exp: currentExp } = userData;
                    const currentLevel = Math.floor(currentExp / 100) || 1;
                    const requiredExp = currentLevel * 100;
                    const levelText = format({
                        title: 'Level 📈',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Level: ${currentLevel}\nExperience: ${currentExp} XP\nRequired for next level: ${requiredExp - currentExp} XP`,
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
                    const playerLevel = Math.floor(userData.exp / 100) || 1;
                    const playerStrength = playerLevel * 10;
                    const battleChance = Math.random() * (playerStrength / (playerStrength + enemy.strength));

                    if (battleChance > 0.3) {
                        const newExp = await Currencies.increaseExp(senderID, enemy.exp);
                        if (Currencies.useItemCollection) {
                            const itemId = await Currencies._resolveItemId(enemy.loot);
                            await Currencies.addItem(senderID, itemId, 1);
                            const item = await Currencies.getItem(itemId);
                            const battleWinText = format({
                                title: 'Battle 🗡️',
                                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                                content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${item.name} x1. New XP: ${newExp}`,
                            });
                            chat.reply(battleWinText);
                        } else {
                            await Currencies.addItem(senderID, enemy.loot, 1);
                            const battleWinText = format({
                                title: 'Battle 🗡️',
                                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                                content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${newExp}`,
                            });
                            chat.reply(battleWinText);
                        }
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
                    const inventory = await Currencies.getInventory(senderID);
                    let inventoryContent;
                    if (Currencies.useItemCollection) {
                        const itemEntries = await Promise.all(
                            Object.entries(inventory).map(async ([itemId, data]) => {
                                try {
                                    const item = await Currencies.getItem(itemId);
                                    return `${item.name}: ${data.quantity}`;
                                } catch (error) {
                                    return `${itemId}: ${data.quantity} (Unknown Item)`;
                                }
                            })
                        );
                        inventoryContent = itemEntries.length > 0 ? `Items: ${itemEntries.join(", ")}` : "Your inventory is empty!";
                    } else {
                        inventoryContent = Object.keys(inventory).length > 0
                            ? `Items: ${Object.entries(inventory).map(([item, data]) => `${item}: ${data.quantity}`).join(", ")}`
                            : "Your inventory is empty!";
                    }
                    const inventoryText = format({
                        title: 'Inventory 🎒',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\n${inventoryContent}`,
                    });
                    chat.reply(inventoryText);
                    break;

                default:
                    const helpText = format({
                        title: 'Menu ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Available commands:\n- rpg register <name>\n- rpg stats\n- rpg earn\n- rpg level\n- rpg battle\n- rpg inventory`,
                    });
                    chat.reply(helpText);
            }
        } catch (error) {
            console.error(error);
            chat.reply('An error occurred while processing your RPG command. Please try again later.');
        }
    }
};