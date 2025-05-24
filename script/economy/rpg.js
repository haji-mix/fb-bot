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
            contentFont: "fancy",
        },
        titleFont: "bold",
        contentFont: "fancy",
    },
    run: async ({ chat, event, Utils, format, UNIRedux, FontSystem, abbreviateNumber }) => {
        try {

            const { senderID } = event;
            const { Currencies } = Utils;
            const args = event.body?.split(" ").slice(1) || [];

            let userData = await Currencies.getData(senderID);
            if (!userData) {
                userData = { balance: 0, exp: 0, inventory: {}, name: null };
            }

            let balance = userData.balance || 0;
            let exp = userData.exp || 0;
            let level = Math.floor(exp / 100) || 1;
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            const formattedFooter = format({
                content: FontSystem.applyFonts(module.exports.style.footer.content, module.exports.style.footer.contentFont),
                contentFont: module.exports.style.footer.contentFont
            });

            const titlePattern = `${UNIRedux.arrow} {word}`;

            if (args[0]?.toLowerCase() !== "register" && !playerName) {
                const notRegisteredText = format({
                    title: FontSystem.applyFonts('Register 🚫', 'bold'),
                    titlePattern,
                    content: FontSystem.applyFonts(`You need to register first! Use: rpg register <name>\n\n${formattedFooter}`, 'fancy'),
                    titleFont: 'bold',
                    contentFont: 'fancy'
                });
                return chat.reply(notRegisteredText);
            }

            const subcommand = args[0]?.toLowerCase() || "help";

            switch (subcommand) {
                case "register":
                    if (playerName) {
                        const alreadyRegisteredText = format({
                            title: FontSystem.applyFonts('Register 📝', 'bold'),
                            titlePattern,
                            content: FontSystem.applyFonts(`You are already registered as ${playerName}!\n\n${formattedFooter}`, 'fancy'),
                            titleFont: 'bold',
                            contentFont: 'fancy'
                        });
                        return chat.reply(alreadyRegisteredText);
                    }
                    const name = args.slice(1).join(" ").trim();
                    if (!name) {
                        const noNameText = format({
                            title: FontSystem.applyFonts('Register 🚫', 'bold'),
                            titlePattern,
                            content: FontSystem.applyFonts(`Please provide a name! Usage: rpg register <name>\n\n${formattedFooter}`, 'fancy'),
                            titleFont: 'bold',
                            contentFont: 'fancy'
                        });
                        return chat.reply(noNameText);
                    }
                    await Currencies.setData(senderID, { name, balance: 100, exp: 0, inventory: {} });
                    const registerText = format({
                        title: FontSystem.applyFonts('Register ✅', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`Welcome, ${name}! You’ve registered as a new adventurer with $100.\n\n${formattedFooter}`, 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(registerText);

                case "stats":
                    const statsText = format({
                        title: FontSystem.applyFonts('Stats 📊', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${abbreviateNumber(balance)}\n\n${formattedFooter}`, 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(statsText);

                case "earn":
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    await Currencies.increaseMoney(senderID, earnAmount);
                    const earnText = format({
                        title: FontSystem.applyFonts('Earn 💰', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`You earned $${abbreviateNumber(earnAmount)} from your adventure! New balance: $${abbreviateNumber(balance + earnAmount)}\n\n${formattedFooter}`, 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(earnText);

                case "level":
                    const requiredExp = level * 100;
                    const levelText = format({
                        title: FontSystem.applyFonts('Level 📈', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`Level: ${level}\nExperience: ${exp} XP\nRequired for next level: ${requiredExp - exp} XP\n\n${formattedFooter}`, 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(levelText);

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
                            title: FontSystem.applyFonts('Battle 🗡️', 'bold'),
                            titlePattern,
                            content: FontSystem.applyFonts(`You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${exp + enemy.exp}\n\n${formattedFooter}`, 'fancy'),
                            titleFont: 'bold',
                            contentFont: 'fancy'
                        });
                        return chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: FontSystem.applyFonts('Battle 🛡️', 'bold'),
                            titlePattern,
                            content: FontSystem.applyFonts(`You were defeated by a ${enemy.name}! Details: Health: ${enemy.health}, Strength: ${enemy.strength}. Try again later.\n\n${formattedFooter}`, 'fancy'),
                            titleFont: 'bold',
                            contentFont: 'fancy'
                        });
                        return chat.reply(battleLoseText);
                    }

                case "inventory":
                    const inventoryItems = [];
                    if (inventory && typeof inventory === 'object') {
                        for (const [itemId, data] of Object.entries(inventory)) {
                            try {
                                if (data && typeof data.quantity === 'number') {
                                    const item = await Currencies.getItem(itemId);
                                    inventoryItems.push(`${item.name}: ${data.quantity}`);
                                } else {
                                    inventoryItems.push(`Invalid Item (ID: ${itemId}): ${data?.quantity || 'N/A'}`);
                                }
                            } catch (error) {
                                inventoryItems.push(`Unknown Item (ID: ${itemId}): ${data?.quantity || 'N/A'}`);
                            }
                        }
                    } else {
                        inventoryItems.push("No items found or inventory is invalid.");
                    }
                    const inventoryText = format({
                        title: FontSystem.applyFonts('Inventory 🎒', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`Player: ${playerName}\n` +
                            (inventoryItems.length > 0
                                ? `Items: ${inventoryItems.join(", ")}\n\n${formattedFooter}`
                                : `Your inventory is empty!\n\n${formattedFooter}`), 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(inventoryText);

                default:
                    const helpText = format({
                        title: FontSystem.applyFonts('Menu ℹ️', 'bold'),
                        titlePattern,
                        content: FontSystem.applyFonts(`Available commands:\n- rpg register <name>\n- rpg stats\n- rpg earn\n- rpg level\n- rpg battle\n- rpg inventory\n\n${formattedFooter}`, 'fancy'),
                        titleFont: 'bold',
                        contentFont: 'fancy'
                    });
                    return chat.reply(helpText);
            }
        } catch (error) {
            const fallbackMessage = `An error occurred while processing your RPG command: ${error.message}. Please try again later or contact admins/mods using 'callad'.\n\n${module.exports.style.footer.content}`;
            try {
                const errorText = format({
                    title: FontSystem.applyFonts('Error', 'bold'),
                    titlePattern: `${UNIRedux.arrow} {word}`,
                    content: FontSystem.applyFonts(fallbackMessage, 'fancy'),
                    titleFont: 'bold',
                    contentFont: 'fancy'
                });
                return chat.reply(errorText);
            } catch (formatError) {
                return chat.reply(fallbackMessage);
            }
        }
    }
};