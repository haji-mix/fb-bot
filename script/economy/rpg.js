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

            if (!Currencies || typeof Currencies.getData !== 'function') {
                throw new Error('Currencies is not properly initialized.');
            }

            const subcommand = args[0]?.toLowerCase();
            let userData = await Currencies.getData(senderID);
            let balance = userData.balance || 0;
            let exp = userData.exp || 0;
            let level = Math.floor(exp / 100) || 1;
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            if (subcommand !== "register" && !playerName) {
                const notRegisteredText = format({
                    title: 'Register 🚫',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: rpg register <name>`
                });
                return chat.reply(notRegisteredText);
            }

            switch (subcommand) {
                case "register":
                    if (playerName) {
                        const alreadyRegisteredText = format({
                            title: 'Register 📝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are already registered as ${playerName}!`
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
                    chat.reply(registerText);
                    break;

                case "stats":
                    const statsText = format({
                        title: 'Stats 📊',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${balance.toLocaleString()}`
                    });
                    chat.reply(statsText);
                    break;

                case "earn":
                    const earnAmount = Math.floor(Math.random() * 50) + 10;
                    await Currencies.increaseMoney(senderID, earnAmount);
                    const earnText = format({
                        title: 'Earn 💰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You earned $${earnAmount.toLocaleString()} from your adventure! New balance: $${(balance + earnAmount).toLocaleString()}`
                    });
                    chat.reply(earnText);
                    break;

                case "level":
                    const requiredExp = level * 100;
                    const levelText = format({
                        title: 'Level 📈',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Level: ${level}\nExperience: ${exp} XP\nRequired for next level: ${requiredExp - exp} XP`
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
                            content: `You defeated a ${enemy.name}! Gained ${enemy.exp} XP and ${enemy.loot} x1. New XP: ${exp + enemy.exp}`
                        });
                        chat.reply(battleWinText);
                    } else {
                        const battleLoseText = format({
                            title: 'Battle 🛡️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You were defeated by a ${enemy.name}! Try again later.`
                        });
                        chat.reply(battleLoseText);
                    }
                    break;
                   case "inventory":
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
                                     : "Your inventory is empty!")
                    });
                    chat.reply(inventoryText);
                    break;

                case "quest":
                    const now = Date.now();
                    const oneDay = 24 * 60 * 60 * 1000;
                    if (userData.lastQuest && now - userData.lastQuest < oneDay) {
                        const timeLeft = Math.ceil((oneDay - (now - userData.lastQuest)) / 3600000);
                        const questCooldownText = format({
                            title: 'Quest 📜',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You've already completed today's quest! Try again in ${timeLeft} hours.`
                        });
                        return chat.reply(questCooldownText);
                    }
                    const questReward = Math.floor(Math.random() * 50) + 20;
                    await Currencies.increaseMoney(senderID, questReward);
                    await Currencies.setData(senderID, { lastQuest: now });
                    const questText = format({
                        title: 'Quest 📜',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You completed a daily quest and earned $${questReward}! New balance: $${(balance + questReward).toLocaleString()}`
                    });
                    chat.reply(questText);
                    break;

                case "shop":
                    const shopItems = [
                        { name: "Sword", price: 150, description: "Increases battle strength" },
                        { name: "Shield", price: 100, description: "Boosts defense in battles" },
                        { name: "Mana Crystal", price: 80, description: "Grants 50 EXP" }
                    ];
                    if (!args[1]) {
                        const shopText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available items:\n${shopItems.map(item => `${item.name}: $${item.price} (${item.description})`).join("\n")}\nUse: rpg shop <item>`
                        });
                        return chat.reply(shopText);
                    }
                    const itemToBuy = shopItems.find(item => item.name.toLowerCase() === args[1].toLowerCase());
                    if (!itemToBuy) {
                        const invalidItemText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item not found! Use: rpg shop to see available items.`
                        });
                        return chat.reply(invalidItemText);
                    }
                    if (balance < itemToBuy.price) {
                        const notEnoughText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Not enough money! You need $${itemToBuy.price}, but you have $${balance}.`
                        });
                        return chat.reply(notEnoughText);
                    }
                    let shopItemId;
                    try {
                        shopItemId = await Currencies._resolveItemId(itemToBuy.name);
                    } catch (error) {
                        await Currencies.createItem({
                            name: itemToBuy.name,
                            price: itemToBuy.price,
                            description: itemToBuy.description,
                            category: "shop_item",
                        });
                        shopItemId = await Currencies._resolveItemId(itemToBuy.name);
                    }
                    await Currencies.increaseMoney(senderID, -itemToBuy.price);
                    await Currencies.addItem(senderID, shopItemId, 1);
                    const buyText = format({
                        title: 'Shop 🏪',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought a ${itemToBuy.name} for $${itemToBuy.price}! New balance: $${(balance - itemToBuy.price).toLocaleString()}`
                    });
                    chat.reply(buyText);
                    break;

                case "use":
                    if (!args[1]) {
                        const useHelpText = format({
                            title: 'Use 🛠️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify an item to use! Use: rpg use <item>`
                        });
                        return chat.reply(useHelpText);
                    }
                    const itemToUse = Object.keys(inventory).find(itemId => {
                        const item = Currencies.getItem(itemId).then(i => i.name.toLowerCase() === args[1].toLowerCase());
                        return item;
                    });
                    if (!itemToUse || inventory[itemToUse]?.quantity <= 0) {
                        const noItemText = format({
                            title: 'Use 🛠️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that item! Check your inventory with: rpg inventory`
                        });
                        return chat.reply(noItemText);
                    }
                    const itemDetails = await Currencies.getItem(itemToUse);
                    if (itemDetails.name === "Health Potion" || itemDetails.name === "Mana Crystal") {
                        const expGain = itemDetails.name === "Health Potion" ? 20 : 50;
                        await Currencies.increaseExp(senderID, expGain);
                        await Currencies.addItem(senderID, itemToUse, -1);
                        const useText = format({
                            title: 'Use 🛠️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You used a ${itemDetails.name} and gained ${expGain} XP! New XP: ${exp + expGain}`
                        });
                        chat.reply(useText);
                    } else {
                        const cannotUseText = format({
                            title: 'Use 🛠️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You can't use ${itemDetails.name}!`
                        });
                        chat.reply(cannotUseText);
                    }
                    break;

                case "trade":
                    if (!args[1] || !args[2] || !args[3]) {
                        const tradeHelpText = format({
                            title: 'Trade 🤝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Use: rpg trade <userID> <item> <quantity>`
                        });
                        return chat.reply(tradeHelpText);
                    }
                    const targetID = args[1];
                    const tradeItemName = args[2].toLowerCase();
                    const tradeQuantity = parseInt(args[3]);
                    if (isNaN(tradeQuantity) || tradeQuantity <= 0) {
                        const invalidQuantityText = format({
                            title: 'Trade 🤝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Please specify a valid quantity!`
                        });
                        return chat.reply(invalidQuantityText);
                    }
                    const tradeItemId = Object.keys(inventory).find(itemId => {
                        const item = Currencies.getItem(itemId).then(i => i.name.toLowerCase() === tradeItemName);
                        return item;
                    });
                    if (!tradeItemId || inventory[tradeItemId]?.quantity < tradeQuantity) {
                        const noItemText = format({
                            title: 'Trade 🤝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have enough of that item! Check your inventory.`
                        });
                        return chat.reply(noItemText);
                    }
                    const targetData = await Currencies.getData(targetID);
                    if (!targetData.name) {
                        const targetNotFoundText = format({
                            title: 'Trade 🤝',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Target user not found or not registered!`
                        });
                        return chat.reply(targetNotFoundText);
                    }
                    await Currencies.addItem(senderID, tradeItemId, -tradeQuantity);
                    await Currencies.addItem(targetID, tradeItemId, tradeQuantity);
                    const tradeText = format({
                        title: 'Trade 🤝',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You traded ${tradeQuantity} ${tradeItemName} to ${targetData.name}!`
                    });
                    chat.reply(tradeText);
                    break;

                case "craft":
                    const craftRecipes = {
                        "Iron Sword": { materials: { "Wolf Pelt": 2, "Troll Club": 1 }, result: "Iron Sword", description: "A stronger sword for battles" }
                    };
                    if (!args[1]) {
                        const craftHelpText = format({
                            title: 'Craft 🔨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available recipes:\n${Object.keys(craftRecipes).map(recipe => `${recipe}: ${Object.entries(craftRecipes[recipe].materials).map(([item, qty]) => `${item} x${qty}`).join(", ")}`).join("\n")}\nUse: rpg craft <recipe>`
                        });
                        return chat.reply(craftHelpText);
                    }
                    const recipe = craftRecipes[args[1]];
                    if (!recipe) {
                        const invalidRecipeText = format({
                            title: 'Craft 🔨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid recipe! Use: rpg craft to see available recipes.`
                        });
                        return chat.reply(invalidRecipeText);
                    }
                    for (const [material, qty] of Object.entries(recipe.materials)) {
                        const materialId = await Currencies._resolveItemId(material);
                        if (!inventory[materialId] || inventory[materialId].quantity < qty) {
                            const missingMaterialText = format({
                                title: 'Craft 🔨',
                                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                                content: `You need ${qty} ${material} to craft this!`
                            });
                            return chat.reply(missingMaterialText);
                        }
                    }
                    for (const [material, qty] of Object.entries(recipe.materials)) {
                        const materialId = await Currencies._resolveItemId(material);
                        await Currencies.addItem(senderID, materialId, -qty);
                    }
                    let craftedItemId;
                    try {
                        craftedItemId = await Currencies._resolveItemId(recipe.result);
                    } catch (error) {
                        await Currencies.createItem({
                            name: recipe.result,
                            price: 200,
                            description: recipe.description,
                            category: "crafted_item",
                        });
                        craftedItemId = await Currencies._resolveItemId(recipe.result);
                    }
                    await Currencies.addItem(senderID, craftedItemId, 1);
                    const craftText = format({
                        title: 'Craft 🔨',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You crafted a ${recipe.result}!`
                    });
                    chat.reply(craftText);
                    break;

                case "explore":
                    const areas = [
                        { name: "Forest", exp: Math.floor(Math.random() * 30) + 10, lootChance: 0.3, loot: "Herb" },
                        { name: "Cave", exp: Math.floor(Math.random() * 40) + 20, lootChance: 0.2, loot: "Crystal" }
                    ];
                    const area = areas[Math.floor(Math.random() * areas.length)];
                    await Currencies.increaseExp(senderID, area.exp);
                    let exploreTextContent = `You explored the ${area.name} and gained ${area.exp} XP! New XP: ${exp + area.exp}`;
                    if (Math.random() < area.lootChance) {
                        let exploreItemId;
                        try {
                            exploreItemId = await Currencies._resolveItemId(area.loot);
                        } catch (error) {
                            await Currencies.createItem({
                                name: area.loot,
                                price: 30,
                                description: `A ${area.loot.toLowerCase()} found while exploring`,
                                category: "exploration_loot",
                            });
                            exploreItemId = await Currencies._resolveItemId(area.loot);
                        }
                        await Currencies.addItem(senderID, exploreItemId, 1);
                        exploreTextContent += `\nYou also found a ${area.loot}!`;
                    }
                    const exploreText = format({
                        title: 'Explore 🗺️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: exploreTextContent
                    });
                    chat.reply(exploreText);
                    break;
                   case "upgrade":
                    const upgradeCost = level * 50;
                    if (balance < upgradeCost) {
                        const notEnoughUpgradeText = format({
                            title: 'Upgrade ⚒️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You need $${upgradeCost} to upgrade your strength! You have $${balance}.`
                        });
                        return chat.reply(notEnoughUpgradeText);
                    }
                    await Currencies.increaseMoney(senderID, -upgradeCost);
                    userData.strength = (userData.strength || level * 10) + 5;
                    await Currencies.setData(senderID, { strength: userData.strength });
                    const upgradeText = format({
                        title: 'Upgrade ⚒️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You upgraded your strength to ${userData.strength}! New balance: $${(balance - upgradeCost).toLocaleString()}`
                    });
                    chat.reply(upgradeText);
                    break;

                case "guild":
                    if (userData.guild) {
                        const guildText = format({
                            title: 'Guild 🏰',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are a member of ${userData.guild}!`
                        });
                        return chat.reply(guildText);
                    }
                    if (!args[1]) {
                        const guildHelpText = format({
                            title: 'Guild 🏰',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Join a guild for bonuses! Use: rpg guild <name>`
                        });
                        return chat.reply(guildHelpText);
                    }
                    const guildName = args.slice(1).join(" ");
                    await Currencies.setData(senderID, { guild: guildName });
                    const joinGuildText = format({
                        title: 'Guild 🏰',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You joined the ${guildName} guild! You now get a 10% XP bonus.`
                    });
                    chat.reply(joinGuildText);
                    break;

                case "arena":
                    if (!args[1]) {
                        const arenaHelpText = format({
                            title: 'Arena ⚔️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Challenge a player in the arena! Use: rpg arena <userID>`
                        });
                        return chat.reply(arenaHelpText);
                    }
                    const opponentID = args[1];
                    const opponentData = await Currencies.getData(opponentID);
                    if (!opponentData.name) {
                        const opponentNotFoundText = format({
                            title: 'Arena ⚔️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Opponent not found or not registered!`
                        });
                        return chat.reply(opponentNotFoundText);
                    }
                    const playerStrengthArena = (userData.strength || level * 10);
                    const opponentStrength = (opponentData.strength || Math.floor(opponentData.exp / 100) * 10);
                    const arenaChance = Math.random() * (playerStrengthArena / (playerStrengthArena + opponentStrength));
                    if (arenaChance > 0.5) {
                        const arenaReward = Math.floor(Math.random() * 100) + 50;
                        await Currencies.increaseMoney(senderID, arenaReward);
                        const arenaWinText = format({
                            title: 'Arena ⚔️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You defeated ${opponentData.name} in the arena! Earned $${arenaReward}. New balance: $${(balance + arenaReward).toLocaleString()}`
                        });
                        chat.reply(arenaWinText);
                    } else {
                        const arenaLoseText = format({
                            title: 'Arena ⚔️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You were defeated by ${opponentData.name} in the arena!`
                        });
                        chat.reply(arenaLoseText);
                    }
                    break;

                case "leaderboard":
                    const allUsers = await Currencies.getAll();
                    const sortedUsers = allUsers
                        .filter(user => user.name)
                        .sort((a, b) => (Math.floor(b.exp / 100) || 1) - (Math.floor(a.exp / 100) || 1))
                        .slice(0, 5);
                    const leaderboardText = format({
                        title: 'Leaderboard 🏆',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Top 5 Players:\n${sortedUsers.map((user, i) => `${i + 1}. ${user.name} - Level ${Math.floor(user.exp / 100) || 1}`).join("\n")}`
                    });
                    chat.reply(leaderboardText);
                    break;

                case "train":
                    const trainExp = Math.floor(Math.random() * 30) + 15;
                    await Currencies.increaseExp(senderID, trainExp);
                    const trainText = format({
                        title: 'Train 💪',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You trained hard and gained ${trainExp} XP! New XP: ${exp + trainExp}`
                    });
                    chat.reply(trainText);
                    break;

                case "heal":
                    if (!inventory || !Object.keys(inventory).some(itemId => (await Currencies.getItem(itemId)).name === "Health Potion")) {
                        const noHealText = format({
                            title: 'Heal ❤️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You need a Health Potion to heal! Get one from battles or the shop.`
                        });
                        return chat.reply(noHealText);
                    }
                    const healItemId = Object.keys(inventory).find(itemId => (await Currencies.getItem(itemId)).name === "Health Potion");
                    await Currencies.addItem(senderID, healItemId, -1);
                    await Currencies.increaseExp(senderID, 10); // Small EXP bonus for healing
                    const healText = format({
                        title: 'Heal ❤️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You used a Health Potion to heal and gained 10 XP! New XP: ${exp + 10}`
                    });
                    chat.reply(healText);
                    break;

                case "rest":
                    const restExp = Math.floor(Math.random() * 20) + 5;
                    await Currencies.increaseExp(senderID, restExp);
                    const restText = format({
                        title: 'Rest 😴',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You rested and recovered some energy, gaining ${restExp} XP! New XP: ${exp + restExp}`
                    });
                    chat.reply(restText);
                    break;

                case "fish":
                    const fishLootChance = Math.random();
                    let fishTextContent = `You went fishing and gained 10 XP! New XP: ${exp + 10}`;
                    if (fishLootChance > 0.7) {
                        let fishItemId;
                        try {
                            fishItemId = await Currencies._resolveItemId("Fish");
                        } catch (error) {
                            await Currencies.createItem({
                                name: "Fish",
                                price: 20,
                                description: "A fresh fish from the river",
                                category: "fishing_loot",
                            });
                            fishItemId = await Currencies._resolveItemId("Fish");
                        }
                        await Currencies.addItem(senderID, fishItemId, 1);
                        fishTextContent += `\nYou caught a Fish!`;
                    }
                    const fishText = format({
                        title: 'Fish 🎣',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: fishTextContent
                    });
                    await Currencies.increaseExp(senderID, 10);
                    chat.reply(fishText);
                    break;

                case "mine":
                    const mineLootChance = Math.random();
                    let mineTextContent = `You mined and gained 15 XP! New XP: ${exp + 15}`;
                    if (mineLootChance > 0.6) {
                        let mineItemId;
                        try {
                            mineItemId = await Currencies._resolveItemId("Ore");
                        } catch (error) {
                            await Currencies.createItem({
                                name: "Ore",
                                price: 30,
                                description: "A piece of ore from the mines",
                                category: "mining_loot",
                            });
                            mineItemId = await Currencies._resolveItemId("Ore");
                        }
                        await Currencies.addItem(senderID, mineItemId, 1);
                        mineTextContent += `\nYou found an Ore!`;
                    }
                    const mineText = format({
                        title: 'Mine ⛏️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: mineTextContent
                    });
                    await Currencies.increaseExp(senderID, 15);
                    chat.reply(mineText);
                    break;

                case "sell":
                    if (!args[1]) {
                        const sellHelpText = format({
                            title: 'Sell 💸',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify an item to sell! Use: rpg sell <item>`
                        });
                        return chat.reply(sellHelpText);
                    }
                    const itemToSell = Object.keys(inventory).find(itemId => {
                        const item = Currencies.getItem(itemId).then(i => i.name.toLowerCase() === args[1].toLowerCase());
                        return item;
                    });
                    if (!itemToSell || inventory[itemToSell]?.quantity <= 0) {
                        const noItemText = format({
                            title: 'Sell 💸',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that item! Check your inventory.`
                        });
                        return chat.reply(noItemText);
                    }
                    const itemDetailsSell = await Currencies.getItem(itemToSell);
                    const sellPrice = Math.floor((itemDetailsSell.price || 10) * 0.8); // 80% of original price
                    await Currencies.addItem(senderID, itemToSell, -1);
                    await Currencies.increaseMoney(senderID, sellPrice);
                    const sellText = format({
                        title: 'Sell 💸',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You sold a ${itemDetailsSell.name} for $${sellPrice}! New balance: $${(balance + sellPrice).toLocaleString()}`
                    });
                    chat.reply(sellText);
                    break;

                case "profile":
                    const profileText = format({
                        title: 'Profile 👤',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nLevel: ${level}\nExperience: ${exp} XP\nBalance: $${balance.toLocaleString()}\nStrength: ${userData.strength || level * 10}\nGuild: ${userData.guild || "None"}`
                    });
                    chat.reply(profileText);
                    break;

                case "tournament":
                    if (!args[1]) {
                        const tournamentHelpText = format({
                            title: 'Tournament 🏟️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Join a tournament! Use: rpg tournament <userID>`
                        });
                        return chat.reply(tournamentHelpText);
                    }
                    const opponentIDTournament = args[1];
                    const opponentDataTournament = await Currencies.getData(opponentIDTournament);
                    if (!opponentDataTournament.name) {
                        const opponentNotFoundText = format({
                            title: 'Tournament 🏟️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Opponent not found or not registered!`
                        });
                        return chat.reply(opponentNotFoundText);
                    }
                    const playerStrengthTournament = (userData.strength || level * 10);
                    const opponentStrengthTournament = (opponentDataTournament.strength || Math.floor(opponentDataTournament.exp / 100) * 10);
                    const tournamentChance = Math.random() * (playerStrengthTournament / (playerStrengthTournament + opponentStrengthTournament));
                    if (tournamentChance > 0.5) {
                        const tournamentReward = Math.floor(Math.random() * 200) + 100;
                        await Currencies.increaseMoney(senderID, tournamentReward);
                        const tournamentWinText = format({
                            title: 'Tournament 🏟️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You won the tournament against ${opponentDataTournament.name}! Earned $${tournamentReward}. New balance: $${(balance + tournamentReward).toLocaleString()}`
                        });
                        chat.reply(tournamentWinText);
                    } else {
                        const tournamentLoseText = format({
                            title: 'Tournament 🏟️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You lost the tournament to ${opponentDataTournament.name}!`
                        });
                        chat.reply(tournamentLoseText);
                    }
                    break;

                case "donate":
                    if (!args[1] || !args[2]) {
                        const donateHelpText = format({
                            title: 'Donate 🎁',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Donate money to another player! Use: rpg donate <userID> <amount>`
                        });
                        return chat.reply(donateHelpText);
                    }
                    const targetIDDonate = args[1];
                    const donateAmount = parseInt(args[2]);
                    if (isNaN(donateAmount) || donateAmount <= 0 || donateAmount > balance) {
                        const invalidAmountText = format({
                            title: 'Donate 🎁',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid amount or insufficient funds! You have $${balance}.`
                        });
                        return chat.reply(invalidAmountText);
                    }
                    const targetDataDonate = await Currencies.getData(targetIDDonate);
                    if (!targetDataDonate.name) {
                        const targetNotFoundText = format({
                            title: 'Donate 🎁',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Target user not found or not registered!`
                        });
                        return chat.reply(targetNotFoundText);
                    }
                    await Currencies.increaseMoney(senderID, -donateAmount);
                    await Currencies.increaseMoney(targetIDDonate, donateAmount);
                    const donateText = format({
                        title: 'Donate 🎁',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You donated $${donateAmount} to ${targetDataDonate.name}! New balance: $${(balance - donateAmount).toLocaleString()}`
                    });
                    chat.reply(donateText);
                    break;

                case "pet":
                    if (!args[1]) {
                        const petHelpText = format({
                            title: 'Pet 🐾',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Buy a pet! Available: Dog ($50), Cat ($30). Use: rpg pet <type>`
                        });
                        return chat.reply(petHelpText);
                    }
                    const petType = args[1].toLowerCase();
                    const petCost = petType === "dog" ? 50 : petType === "cat" ? 30 : 0;
                    if (petCost === 0 || balance < petCost) {
                        const invalidPetText = format({
                            title: 'Pet 🐾',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid pet or insufficient funds! You need $${petCost}, but you have $${balance}.`
                        });
                        return chat.reply(invalidPetText);
                    }
                    let petItemId;
                    try {
                        petItemId = await Currencies._resolveItemId(petType === "dog" ? "Dog Pet" : "Cat Pet");
                    } catch (error) {
                        await Currencies.createItem({
                            name: petType === "dog" ? "Dog Pet" : "Cat Pet",
                            price: petCost,
                            description: `A loyal ${petType}`,
                            category: "pet",
                        });
                        petItemId = await Currencies._resolveItemId(petType === "dog" ? "Dog Pet" : "Cat Pet");
                    }
                    await Currencies.increaseMoney(senderID, -petCost);
                    await Currencies.addItem(senderID, petItemId, 1);
                    const petText = format({
                        title: 'Pet 🐾',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought a ${petType === "dog" ? "Dog" : "Cat"} Pet for $${petCost}! New balance: $${(balance - petCost).toLocaleString()}`
                    });
                    chat.reply(petText);
                    break;

                case "questlist":
                    const quests = [
                        { name: "Slay Goblin", reward: 30 },
                        { name: "Gather Herbs", reward: 20 }
                    ];
                    const questListText = format({
                        title: 'Quest List 📜',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Available Quests:\n${quests.map(q => `${q.name}: $${q.reward} reward`).join("\n")}\nUse: rpg quest to complete a random quest.`
                    });
                    chat.reply(questListText);
                    break;

                case "achievement":
                    const achievements = {
                        "First Win": exp >= 100 && !userData.achievements?.includes("First Win"),
                        "Rich Adventurer": balance >= 500 && !userData.achievements?.includes("Rich Adventurer")
                    };
                    let achieved = false;
                    let achievementName = "";
                    for (const [name, condition] of Object.entries(achievements)) {
                        if (condition) {
                            achieved = true;
                            achievementName = name;
                            userData.achievements = userData.achievements || [];
                            userData.achievements.push(name);
                            await Currencies.setData(senderID, { achievements: userData.achievements });
                            break;
                        }
                    }
                    const achievementText = format({
                        title: 'Achievement 🏅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: (achieved ? `Congratulations! You earned "${achievementName}" achievement!` : `No new achievements yet. Keep playing!`)
                    });
                    chat.reply(achievementText);
                    break;

                case "event":
                    const eventChance = Math.random();
                    let eventTextContent = `You participated in an event and gained 25 XP! New XP: ${exp + 25}`;
                    if (eventChance > 0.5) {
                        const eventReward = Math.floor(Math.random() * 100) + 50;
                        await Currencies.increaseMoney(senderID, eventReward);
                        eventTextContent += `\nYou won $${eventReward} in the event! New balance: $${(balance + eventReward).toLocaleString()}`;
                    }
                    const eventText = format({
                        title: 'Event 🎉',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: eventTextContent
                    });
                    await Currencies.increaseExp(senderID, 25);
                    chat.reply(eventText);
                    break;

                case "journey":
                    const journeyExp = Math.floor(Math.random() * 100) + 50;
                    await Currencies.increaseExp(senderID, journeyExp);
                    let journeyTextContent = `You embarked on a journey and gained ${journeyExp} XP! New XP: ${exp + journeyExp}`;
                    if (Math.random() > 0.4) {
                        let journeyItemId;
                        try {
                            journeyItemId = await Currencies._resolveItemId("Rare Gem");
                        } catch (error) {
                            await Currencies.createItem({
                                name: "Rare Gem",
                                price: 100,
                                description: "A rare gem from your journey",
                                category: "journey_loot",
                            });
                            journeyItemId = await Currencies._resolveItemId("Rare Gem");
                        }
                        await Currencies.addItem(senderID, journeyItemId, 1);
                        journeyTextContent += `\nYou found a Rare Gem!`;
                    }
                    const journeyText = format({
                        title: 'Journey 🌍',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: journeyTextContent
                    });
                    chat.reply(journeyText);
                    break;

                default:
                    const helpText = format({
                        title: '**Menu** ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `***Available commands***:\n- rpg register <name>\n- rpg stats\n- rpg earn\n- rpg level\n- rpg battle\n- rpg inventory\n- rpg quest\n- rpg shop <item>\n- rpg use <item>\n- rpg trade <userID> <item> <quantity>\n- rpg craft <recipe>\n- rpg explore\n- rpg upgrade\n- rpg guild <name>\n- rpg arena <userID>\n- rpg leaderboard\n- rpg train\n- rpg heal\n- rpg rest\n- rpg fish\n- rpg mine\n- rpg sell <item>\n- rpg profile\n- rpg tournament <userID>\n- rpg donate <userID> <amount>\n- rpg pet <type>\n- rpg questlist\n- rpg achievement\n- rpg event\n- rpg journey`
                    });
                    chat.reply(helpText);
            }
        } catch (error) {
            console.error(error);
            const errorText = format({
                title: 'Err',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `An error occurred while processing your RPG command. Please try again later.`
            });
            chat.reply(errorText);
        }
    }
};
      