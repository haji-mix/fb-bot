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
            const args = event.body?.split(" ").slice(1) || [];

            const getUserData = async () => {
                const userData = await Currencies.getData(senderID);
                return {
                    balance: userData?.balance || 0,
                    exp: userData?.exp || 0,
                    level: Math.floor((userData?.exp || 0) / 100) || 1,
                    inventory: userData?.inventory || {},
                    name: userData?.name || null
                };
            };

            let userData = await getUserData();
            const subcommand = args[0]?.toLowerCase() || '';


            if (subcommand !== "register" && !userData.name) {
                const notRegisteredText = format({
                    title: 'Register 🚫',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: rpg register <name>`
                });
                return chat.reply(notRegisteredText);
            }

            switch (subcommand) {
                case "register": {
                    if (userData.name) {
                        const alreadyRegisteredText = format({
                            title: 'Register 📝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are already registered as ${userData.name}!`
                        });
                        return chat.reply(alreadyRegisteredText);
                    }
                    const name = args.slice(1).join(" ").trim();
                    if (!name) {
                        const noNameText = format({
                            title: 'Register 🚫',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Please provide a name! Usage: rpg register <name>`
                        });
                        return chat.reply(noNameText);
                    }
                    await Currencies.setData(senderID, { name, balance: 100, exp: 0, inventory: {} });
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You’ve registered as a new adventurer with $100.`
                    });
                    return chat.reply(registerText);
                }

                case "stats": {
                    const statsText = format({
                        title: 'Stats 📊',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${userData.name}\nLevel: ${userData.level}\nExperience: ${userData.exp} XP\nBalance: $${userData.balance.toLocaleString()}`
                    });
                    return chat.reply(statsText);
                }

                case "earn": {
                    if (typeof Currencies.increaseMoney !== 'function') {
                        throw new Error('increaseMoney method is not available.');
                    }
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    await Currencies.increaseMoney(senderID, earnAmount);
                    userData = await getUserData(); // Refresh user data
                    const earnText = format({
                        title: 'Earn 💰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You earned $${earnAmount.toLocaleString()} from your adventure! New balance: $${userData.balance.toLocaleString()}`
                    });
                    return chat.reply(earnText);
                }

                case "level": {
                    const requiredExp = userData.level * 100;
                    const levelText = format({
                        title: 'Level 📈',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Level: ${userData.level}\nExperience: ${userData.exp} XP\nRequired for next level: ${requiredExp - userData.exp} XP`
                    });
                    return chat.reply(levelText);
                }

                case "battle": {
                    if (typeof Currencies.increaseExp !== 'function' || typeof Currencies.addItem !== 'function') {
                        throw new Error('Required battle methods are not available.');
                    }
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
                        if (typeof Currencies.createItem !== 'function') {
                            throw new Error('createItem method is not available.');
                        }
                        await Currencies.createItem({
                            name: enemy.loot,
                            price: 50,
                            description: `A ${enemy.loot.toLowerCase()} obtained from defeating a ${enemy.name}`,
                            category: "battle_loot"
                        });
                        itemId = await Currencies._resolveItemId(enemy.loot);
                    }

                    const playerStrength = userData.level * 10;
                    const battleChance = Math.random() * (playerStrength / (playerStrength + enemy.strength));
                    if (battleChance > 0.3) {
                        await Currencies.increaseExp(senderID, enemy.exp);
                        await Currencies.addItem(senderID, itemId, 1);
                        userData = await getUserData(); // Refresh user data
                        const battleWinText = format({
                            title: 'Battle 🗡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${userData.exp}`
                        });
                        return chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: 'Battle 🛡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You were defeated by a ${enemy.name}! Try again later.`
                        });
                        return chat.reply(battleLoseText);
                    }
                }

                case "inventory": {
                    if (typeof Currencies.getItem !== 'function') {
                        throw new Error('getItem method is not available.');
                    }
                    const inventoryItems = [];
                    if (Object.keys(userData.inventory).length > 0) {
                        for (const [itemId, data] of Object.entries(userData.inventory)) {
                            try {
                                const item = await Currencies.getItem(itemId);
                                inventoryItems.push(`${item.name}: ${data.quantity}`);
                            } catch (error) {
                                inventoryItems.push(`Unknown Item (ID: ${itemId}): ${data.quantity}`);
                            }
                        }
                    }
                    const inventoryText = format({
                        title: 'Inventory 🎒',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${userData.name}\n` +
                                 (inventoryItems.length > 0
                                     ? `Items: ${inventoryItems.join(", ")}`
                                     : "Your inventory is empty!")
                    });
                    return chat.reply(inventoryText);
                }

                default: {
                    const helpText = format({
                        title: 'Menu ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Available commands:\n- rpg register <name>\n- rpg stats\n- rpg earn\n- rpg level\n- rpg battle\n- rpg inventory`
                    });
                    return chat.reply(helpText);
                }
            }
        } catch (error) {
            console.error('RPG Command Error:', error);
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'An error occurred while processing your RPG command. Please try again later.'
            });
            return chat.reply(errorText);
        }
    }
};