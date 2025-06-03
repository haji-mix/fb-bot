
module.exports = {
    config: {
        name: "garden",
        aliases: ["grd"],
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 10,
        description: "Manage your garden in a Roblox-inspired farming simulator",
        prefix: true
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 🌱 〙 Grow a Garden",
            line_bottom: "default"
        },
        titleFont: "bold",
        contentFont: "fancy"
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;
            const args = event.body?.split(" ").slice(1) || [];

            const itemData = {
                "carrot seed": { price: 10, category: "seed", description: "Grows into a carrot (single-use)", harvestValue: 25, growthTime: 60 * 1000, multiHarvest: false },
                "strawberry seed": { price: 20, category: "seed", description: "Grows into strawberries (multi-harvest)", harvestValue: 40, growthTime: 120 * 1000, multiHarvest: true, maxHarvests: 3 },
                "pumpkin seed": { price: 30, category: "seed", description: "Grows into a pumpkin (single-use)", harvestValue: 60, growthTime: 180 * 1000, multiHarvest: false },
                "watering can": { price: 50, category: "gear", description: "Reduces watering cooldown" },
                "common sprinkler": { price: 100, category: "gear", description: "Automates watering, boosts mutation chance" },
                "common egg": { price: 200, category: "egg", description: "Hatches into a common pet" }
            };

            const mutations = {
                wet: { valueMultiplier: 2, source: "Rainstorm or Sprinkler" },
                gold: { valueMultiplier: 5, source: "Sprinkler or Pet" },
                moonlit: { valueMultiplier: 10, source: "Lunar Glow Event or Pet" }
            };

            const subcommand = args[0]?.toLowerCase();
            let userData = await Currencies.getData(senderID);
            let balance = userData.balance || 0;
            let inventory = userData.inventory || {};
            let plants = userData.plants || {};
            let pets = userData.pets || {};
            let playerName = userData.name || null;
            let lastWatered = userData.lastWatered || 0;

            if (subcommand !== "register" && !playerName) {
                return chat.reply(format({
                    title: "Register 🚫",
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: garden register <name>`
                }));
            }

            switch (subcommand) {
                case "register":
                    if (playerName) {
                        return chat.reply(format({
                            title: "Register 📝",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You are already registered as ${playerName}!`
                        }));
                    }
                    const name = args.slice(1).join(" ").trim().slice(0, 20);
                    if (!name) {
                        return chat.reply(format({
                            title: "Register 🚫",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Please provide a name! Usage: garden register <name>`
                        }));
                    }
                    await Currencies.setData(senderID, {
                        name,
                        balance: 20,
                        inventory: {},
                        plants: {},
                        pets: {},
                        lastWatered: 0
                    });
                    return chat.reply(format({
                        title: "Register ✅",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You’ve started your garden with 20 Sheckles.`
                    }));

                case "stats":
                    return chat.reply(format({
                        title: "Stats 📊",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nSheckles: ${balance.toLocaleString()}\nPlants Growing: ${Object.keys(plants).length}\nPets: ${Object.keys(pets).length}`
                    }));

                case "plant":
                    if (!args[1]) {
                        return chat.reply(format({
                            title: "Plant 🌱",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify a seed to plant! Use: garden plant <seed>`
                        }));
                    }
                    const seedType = args[1].toLowerCase();
                    const seedItem = itemData[seedType];
                    if (!seedItem || seedItem.category !== "seed") {
                        return chat.reply(format({
                            title: "Plant 🌱",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid seed! Available: ${Object.keys(itemData).filter(k => itemData[k].category === "seed").join(", ")}`
                        }));
                    }
                    let itemId = await Currencies._resolveItemId(seedType).catch(async () => {
                        await Currencies.createItem({
                            name: seedType,
                            price: seedItem.price,
                            description: seedItem.description,
                            category: seedItem.category
                        });
                        return Currencies._resolveItemId(seedType);
                    });
                    if (!inventory[itemId] || inventory[itemId].quantity <= 0) {
                        return chat.reply(format({
                            title: "Plant 🌱",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have ${seedType}! Check your inventory with: garden inventory`
                        }));
                    }
                    if (Object.keys(plants).length >= 6) {
                        return chat.reply(format({
                            title: "Plant 🌱",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Your garden is full (max 6 plants)! Harvest some plants first.`
                        }));
                    }
                    await Currencies.removeItem(senderID, itemId, 1);
                    const plantId = `${Date.now()}_${senderID}`;
                    plants[plantId] = {
                        type: seedType,
                        plantedAt: Date.now(),
                        growthStage: 0,
                        mutations: [],
                        harvestsLeft: seedItem.multiHarvest ? seedItem.maxHarvests : 1
                    };
                    await Currencies.setData(senderID, { plants });
                    return chat.reply(format({
                        title: "Plant 🌱",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You planted a ${seedType}!`
                    }));

                case "water":
                    const now = Date.now();
                    const oneHour = 3600000;
                    const hasWateringCan = inventory[await Currencies._resolveItemId("watering can")]?.quantity > 0;
                    const hasSprinkler = inventory[await Currencies._resolveItemId("common sprinkler")]?.quantity > 0;
                    const cooldown = hasWateringCan ? oneHour / 2 : oneHour;
                    if (!hasSprinkler && now - lastWatered < cooldown) {
                        return chat.reply(format({
                            title: "Water 💧",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You've already watered! Try again in ${Math.ceil((cooldown - (now - lastWatered)) / 60000)} minutes.`
                        }));
                    }
                    let watered = false;
                    const mutationChance = hasSprinkler ? 0.2 : 0.05;
                    for (const plantId in plants) {
                        const plant = plants[plantId];
                        if (plant.growthStage < 2) {
                            plant.growthStage = Math.min(plant.growthStage + 1, 2);
                            if (Math.random() < mutationChance) {
                                const availableMutations = Object.keys(mutations);
                                const randomMutation = availableMutations[Math.floor(Math.random() * availableMutations.length)];
                                if (!plant.mutations.includes(randomMutation)) {
                                    plant.mutations.push(randomMutation);
                                }
                            }
                            watered = true;
                        }
                    }
                    if (!watered) {
                        return chat.reply(format({
                            title: "Water 💧",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `No plants need watering right now!`
                        }));
                    }
                    await Currencies.setData(senderID, { plants, lastWatered: hasSprinkler ? 0 : now });
                    return chat.reply(format({
                        title: "Water 💧",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You watered your plants! They’re growing stronger.`
                    }));

                case "harvest":
                    let earnings = 0;
                    let harvestedCount = 0;
                    const newPlants = {};
                    for (const plantId in plants) {
                        const plant = plants[plantId];
                        const seedInfo = itemData[plant.type];
                        if (plant.growthStage === 2) {
                            let value = seedInfo.harvestValue;
                            for (const mutation of plant.mutations) {
                                value *= mutations[mutation].valueMultiplier;
                            }
                            earnings += value;
                            harvestedCount++;
                            if (seedInfo.multiHarvest && plant.harvestsLeft > 1) {
                                plant.harvestsLeft -= 1;
                                plant.growthStage = 0;
                                newPlants[plantId] = plant;
                            }
                        } else {
                            newPlants[plantId] = plant;
                        }
                    }
                    if (harvestedCount === 0) {
                        return chat.reply(format({
                            title: "Harvest 🌾",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `No mature plants to harvest! Water your plants to help them grow.`
                        }));
                    }
                    await Currencies.increaseMoney(senderID, earnings);
                    await Currencies.setData(senderID, { plants: newPlants });
                    return chat.reply(format({
                        title: "Harvest 🌾",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You harvested ${harvestedCount} plants and earned ${earnings} Sheckles! New balance: ${(balance + earnings).toLocaleString()}`
                    }));

                case "inventory":
                    const inventoryItems = [];
                    for (const [itemId, data] of Object.entries(inventory)) {
                        try {
                            const item = await Currencies.getItem(itemId);
                            inventoryItems.push(`${item.name}: ${data.quantity}`);
                        } catch {
                            inventoryItems.push(`Unknown Item (ID: ${itemId}): ${data.quantity}`);
                        }
                    }
                    const plantItems = Object.entries(plants).map(([plantId, plant]) => {
                        const stageText = ["Seed", "Growing", "Mature"][plant.growthStage];
                        const mutationsText = plant.mutations.length > 0 ? ` [${plant.mutations.join(", ")}]` : "";
                        return `${plant.type} (${stageText}${mutationsText})`;
                    });
                    return chat.reply(format({
                        title: "Inventory 🎒",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\n` +
                                 (inventoryItems.length > 0 ? `Items: ${inventoryItems.join(", ")}` : "No items in inventory!") +
                                 `\n` +
                                 (plantItems.length > 0 ? `Plants: ${plantItems.join(", ")}` : "No plants growing!")
                    }));

                case "shop":
                    if (!args[1]) {
                        return chat.reply(format({
                            title: "Shop 🏪",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available items:\n${Object.entries(itemData).map(([name, data]) => `${name}: ${data.price} Sheckles (${data.description})`).join("\n")}\nUse: garden shop <item>`
                        }));
                    }
                    const itemName = args[1].toLowerCase();
                    const item = itemData[itemName];
                    if (!item) {
                        return chat.reply(format({
                            title: "Shop 🏪",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item not found! Use: garden shop to see available items.`
                        }));
                    }
                    if (balance < item.price) {
                        return chat.reply(format({
                            title: "Shop 🏪",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Not enough Sheckles! You need ${item.price}, but you have ${balance}.`
                        }));
                    }
                    let shopItemId = await Currencies._resolveItemId(itemName).catch(async () => {
                        await Currencies.createItem({
                            name: itemName,
                            price: item.price,
                            description: item.description,
                            category: item.category
                        });
                        return Currencies._resolveItemId(itemName);
                    });
                    await Currencies.buyItem(senderID, shopItemId, 1);
                    return chat.reply(format({
                        title: "Shop 🏪",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought a ${itemName} for ${item.price} Sheckles! New balance: ${(balance - item.price).toLocaleString()}`
                    }));

                case "sell":
                    if (!args[1]) {
                        return chat.reply(format({
                            title: "Sell 💸",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify an item to sell! Use: garden sell <item>`
                        }));
                    }
                    const itemToSellName = args[1].toLowerCase();
                    const itemToSellId = await Currencies._resolveItemId(itemToSellName).catch(() => null);
                    if (!itemToSellId || !inventory[itemToSellId] || inventory[itemToSellId].quantity <= 0) {
                        return chat.reply(format({
                            title: "Sell 💸",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that item! Check your inventory.`
                        }));
                    }
                    const itemDetails = itemData[itemToSellName] || { price: 10 };
                    const sellPrice = Math.floor(itemDetails.price * 0.8);
                    await Currencies.sellItem(senderID, itemToSellId, 1, 0.8);
                    return chat.reply(format({
                        title: "Sell 💸",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You sold a ${itemToSellName} for ${sellPrice} Sheckles! New balance: ${(balance + sellPrice).toLocaleString()}`
                    }));

                case "check":
                    const plantStatus = Object.entries(plants).map(([plantId, plant]) => {
                        const seedInfo = itemData[plant.type];
                        const timeSincePlanted = Math.floor((Date.now() - plant.plantedAt) / 60000);
                        if (plant.growthStage < 2 && Date.now() - plant.plantedAt >= seedInfo.growthTime) {
                            plant.growthStage = 2;
                        }
                        const stageText = ["Seed", "Growing", "Mature"][plant.growthStage];
                        const mutationsText = plant.mutations.length > 0 ? ` [${plant.mutations.join(", ")}]` : "";
                        return `${plant.type} (${stageText}${mutationsText}, ${timeSincePlanted} minutes old)`;
                    });
                    await Currencies.setData(senderID, { plants });
                    return chat.reply(format({
                        title: "Check 🌿",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: plantStatus.length > 0 ? `Your plants:\n${plantStatus.join("\n")}` : `No plants growing! Use: garden plant <seed>`
                    }));

                case "hatch":
                    if (!args[1]) {
                        return chat.reply(format({
                            title: "Hatch 🥚",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify an egg to hatch! Use: garden hatch <egg>`
                        }));
                    }
                    const eggType = args[1].toLowerCase();
                    const eggItem = itemData[eggType];
                    if (!eggItem || eggItem.category !== "egg") {
                        return chat.reply(format({
                            title: "Hatch 🥚",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid egg! Available: ${Object.keys(itemData).filter(k => itemData[k].category === "egg").join(", ")}`
                        }));
                    }
                    const eggId = await Currencies._resolveItemId(eggType).catch(() => null);
                    if (!eggId || !inventory[eggId] || inventory[eggId].quantity <= 0) {
                        return chat.reply(format({
                            title: "Hatch 🥚",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that egg! Check your inventory.`
                        }));
                    }
                    await Currencies.removeItem(senderID, eggId, 1);
                    const petId = `${Date.now()}_${senderID}`;
                    pets[petId] = {
                        type: eggType.replace(" egg", " pet"),
                        hunger: 100,
                        lastFed: Date.now()
                    };
                    await Currencies.setData(senderID, { pets });
                    return chat.reply(format({
                        title: "Hatch 🥚",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You hatched a ${eggType} into a ${pets[petId].type}! Feed it with crops to maintain its bonuses.`
                    }));

                case "feed":
                    if (!args[1] || !args[2]) {
                        return chat.reply(format({
                            title: "Feed 🥕",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify a pet and crop! Use: garden feed <petId> <crop>`
                        }));
                    }
                    const petId = args[1];
                    const cropType = args[2].toLowerCase();
                    const cropItem = itemData[cropType];
                    if (!pets[petId]) {
                        return chat.reply(format({
                            title: "Feed 🥕",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid pet! Check your pets with: garden inventory`
                        }));
                    }
                    if (!cropItem || cropItem.category !== "seed") {
                        return chat.reply(format({
                            title: "Feed 🥕",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid crop! Available: ${Object.keys(itemData).filter(k => itemData[k].category === "seed").map(k => k.replace(" seed", "")).join(", ")}`
                        }));
                    }
                    const cropId = await Currencies._resolveItemId(cropType).catch(() => null);
                    if (!cropId || !inventory[cropId] || inventory[cropId].quantity <= 0) {
                        return chat.reply(format({
                            title: "Feed 🥕",
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that crop! Check your inventory.`
                        }));
                    }
                    await Currencies.removeItem(senderID, cropId, 1);
                    pets[petId].hunger = Math.min(pets[petId].hunger + 50, 100);
                    pets[petId].lastFed = Date.now();
                    await Currencies.setData(senderID, { pets });
                    return chat.reply(format({
                        title: "Feed 🥕",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You fed your ${pets[petId].type} with a ${cropType.replace(" seed", "")}! Hunger: ${pets[petId].hunger}%`
                    }));

                default:
                    return chat.reply(format({
                        title: "Menu ℹ️",
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `**Available commands**:\n- garden register <name>\n- garden stats\n- garden plant <seed>\n- garden water\n- garden harvest\n- garden inventory\n- garden shop <item>\n- garden sell <item>\n- garden check\n- garden hatch <egg>\n- garden feed <petId> <crop>`
                    }));
            }
        } catch (error) {
            console.error(error);
            return chat.reply(format({
                title: "Error",
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `An error occurred while processing your garden command. Please try again later.`
            }));
        }
    }
};
