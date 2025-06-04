const axios = require('axios');

module.exports = {
    config: {
        name: "garden",
        aliases: ["grow"],
        type: "economy",
        author: "Kenneth Panio",
        role: 0,
        cooldowns: 10,
        description: "Manage your garden, plant seeds, and decorate!",
        prefix: true
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 🌱 〙 Garden",
            line_bottom: "default",
        },
        titleFont: "bold",
        contentFont: "fancy",
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;
            const args = event.body?.split(" ").slice(1) || [];
            const subcommand = args[0]?.toLowerCase();
            let userData = await Currencies.getData(senderID);
            let balance = userData.balance || 0;
            let garden = userData.garden || { crops: [], decorations: [] };
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            // API configuration for Grow a Garden
            const apiConfig = {
                method: 'GET',
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'sec-ch-ua-platform': '"Android"',
                    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
                    'dnt': '1',
                    'sec-ch-ua-mobile': '?1',
                    'sec-fetch-site': 'same-origin',
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-dest': 'empty',
                    'referer': 'https://growagarden.gg/values',
                    'accept-language': 'en-US,en;q=0.9',
                    'priority': 'u=1, i',
                    'Cookie': 'dannyNotificationDismissed1=true; _ga=GA1.1.1068361458.1748996221; ...'
                }
            };

            // Check if player is registered
            if (subcommand !== "register" && !playerName) {
                const notRegisteredText = format({
                    title: 'Register 🚫',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need to register first! Use: garden register <name>`
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
                            content: `Please provide a name! Usage: garden register <name>`
                        });
                        return chat.reply(noNameText);
                    }
                    await Currencies.setData(senderID, { name, balance: 100, garden: { crops: [], decorations: [] }, inventory: {} });
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You’ve started your garden with $100.`
                    });
                    chat.reply(registerText);
                    break;

                case "plant":
                    if (!args[1]) {
                        const plantHelpText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify a seed to plant! Use: garden plant <seed>`
                        });
                        return chat.reply(plantHelpText);
                    }
                    let seedId;
                    try {
                        seedId = await Currencies._resolveItemId(args[1]);
                    } catch (error) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that seed! Check your inventory with: garden inventory`
                        });
                        return chat.reply(noSeedText);
                    }
                    if (!inventory[seedId] || inventory[seedId].quantity <= 0) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have enough ${args[1]} seeds!`
                        });
                        return chat.reply(noSeedText);
                    }
                    const seedDetails = await Currencies.getItem(seedId);
                    await Currencies.removeItem(senderID, seedId, 1);
                    garden.crops.push({ name: seedDetails.name, plantedAt: Date.now(), growthTime: 600000 });
                    await Currencies.setData(senderID, { garden });
                    const plantText = format({
                        title: 'Plant 🌱',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You planted a ${seedDetails.name} seed! It will be ready to harvest in 10 minutes.`
                    });
                    chat.reply(plantText);
                    break;

                case "harvest":
                    const now = Date.now();
                    const readyCrops = garden.crops.filter(crop => now - crop.plantedAt >= crop.growthTime);
                    if (readyCrops.length === 0) {
                        const noCropsText = format({
                            title: 'Harvest 🌾',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `No crops are ready to harvest yet! Check your garden with: garden status`
                        });
                        return chat.reply(noCropsText);
                    }
                    let harvestResults = [];
                    for (const crop of readyCrops) {
                        const cropDetails = await Currencies.getItemByName(crop.name);
                        const sellValue = cropDetails.metadata?.sellValue || "20";
                        const value = parseInt(sellValue.replace(/[^0-9]/g, '')) || 20;
                        await Currencies.increaseMoney(senderID, value);
                        balance += value;
                        harvestResults.push(`${crop.name}: $${value}`);
                    }
                    garden.crops = garden.crops.filter(crop => now - crop.plantedAt < crop.growthTime);
                    await Currencies.setData(senderID, { garden, balance });
                    const harvestText = format({
                        title: 'Harvest 🌾',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You harvested:\n${harvestResults.join("\n")}\nNew balance: $${balance.toLocaleString()}`
                    });
                    chat.reply(harvestText);
                    break;

                case "shop":
                    const shopResponse = await axios.get('https://growagardenstock.com/api/stock?type=gear-seeds', apiConfig);
                    const shopItems = [...shopResponse.data.seeds, ...shopResponse.data.gear].map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) };
                    });
                    if (!args[1]) {
                        const shopText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available items:\n${shopItems.map(item => `${item.name} x${item.quantity}`).join("\n")}\nUse: garden shop <item>`
                        });
                        return chat.reply(shopText);
                    }
                    const itemToBuy = shopItems.find(item => item.name.toLowerCase() === args[1].toLowerCase());
                    if (!itemToBuy) {
                        const invalidItemText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item not found! Use: garden shop to see available items.`
                        });
                        return chat.reply(invalidItemText);
                    }
                    const itemDetails = (await axios.get(`https://growagarden.gg/api/v1/items/Gag/all?page=1&limit=24&sortBy=position`, apiConfig)).data.items.find(i => i.name.toLowerCase() === itemToBuy.name.toLowerCase());
                    if (!itemDetails) {
                        return chat.reply(format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item details not found!`
                        }));
                    }
                    const price = parseInt(itemDetails.metadata.buyPrice) || 50;
                    if (balance < price) {
                        const notEnoughText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Not enough money! You need $${price}, but you have $${balance}.`
                        });
                        return chat.reply(notEnoughText);
                    }
                    let shopItemId;
                    try {
                        shopItemId = await Currencies._resolveItemId(itemToBuy.name);
                    } catch (error) {
                        await Currencies.createItem({
                            name: itemToBuy.name,
                            price: price,
                            description: itemDetails.metadata.type === "Crop" ? `A seed for planting ${itemToBuy.name}` : `A gardening tool: ${itemToBuy.name}`,
                            category: itemDetails.metadata.type === "Crop" ? "seed" : "gear",
                            metadata: itemDetails.metadata
                        });
                        shopItemId = await Currencies._resolveItemId(itemToBuy.name);
                    }
                    await Currencies.buyItem(senderID, shopItemId, 1);
                    // Fix: Update balance directly and use setData to decrease money
                    balance -= price;
                    await Currencies.setData(senderID, { balance });
                    const buyText = format({
                        title: 'Shop 🏪',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought a ${itemToBuy.name} for $${price}! New balance: $${balance.toLocaleString()}`
                    });
                    chat.reply(buyText);
                    break;

                case "decorate":
                    const cosmeticsResponse = await axios.get('https://growagardenstock.com/api/special-stock?type=cosmetics', apiConfig);
                    const cosmetics = cosmeticsResponse.data.cosmetics.map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) };
                    });
                    if (!args[1]) {
                        const decorateHelpText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available decorations:\n${cosmetics.map(item => `${item.name} x${item.quantity}`).join("\n")}\nUse: garden decorate <item>`
                        });
                        return chat.reply(decorateHelpText);
                    }
                    const decoration = cosmetics.find(item => item.name.toLowerCase() === args[1].toLowerCase());
                    if (!decoration) {
                        const invalidDecorationText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Decoration not found! Use: garden decorate to see available decorations.`
                        });
                        return chat.reply(invalidDecorationText);
                    }
                    let decorationId;
                    try {
                        decorationId = await Currencies._resolveItemId(decoration.name);
                    } catch (error) {
                        const noDecorationText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that decoration! Check your inventory.`
                        });
                        return chat.reply(noDecorationText);
                    }
                    if (!inventory[decorationId] || inventory[decorationId].quantity <= 0) {
                        const noDecorationText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have enough ${decoration.name}!`
                        });
                        return chat.reply(noDecorationText);
                    }
                    await Currencies.removeItem(senderID, decorationId, 1);
                    garden.decorations.push({ name: decoration.name, placedAt: Date.now() });
                    await Currencies.setData(senderID, { garden });
                    const decorateText = format({
                        title: 'Decorate 🎨',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You placed a ${decoration.name} in your garden!`
                    });
                    chat.reply(decorateText);
                    break;

                case "status":
                    const weatherResponse = await axios.get('https://growagardenstock.com/api/stock/weather', apiConfig);
                    const weather = weatherResponse.data;
                    const cropStatus = garden.crops.map(crop => {
                        const timeLeft = Math.ceil((crop.growthTime - (Date.now() - crop.plantedAt)) / 60000);
                        return `${crop.name}: ${timeLeft > 0 ? `${timeLeft} minutes left` : "Ready to harvest"}`;
                    });
                    const decorationList = garden.decorations.map(deco => deco.name).join(", ") || "None";
                    const statusText = format({
                        title: 'Garden Status 🌳',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\nBalance: $${balance.toLocaleString()}\nWeather: ${weather.currentWeather} (${weather.effectDescription})\nCrops:\n${cropStatus.join("\n") || "No crops planted"}\nDecorations: ${decorationList}`
                    });
                    chat.reply(statusText);
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
                        content: `Player: ${playerName}\n${inventoryItems.length > 0 ? `Items: ${inventoryItems.join(", ")}` : "Your inventory is empty!"}`
                    });
                    chat.reply(inventoryText);
                    break;

                case "hatch":
                    const eggResponse = await axios.get('https://growagardenstock.com/api/stock?type=egg', apiConfig);
                    const eggs = eggResponse.data.egg.map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) };
                    });
                    if (!args[1]) {
                        const hatchHelpText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available eggs:\n${eggs.map(egg => `${egg.name} x${egg.quantity}`).join("\n")}\nUse: garden hatch <egg>`
                        });
                        return chat.reply(hatchHelpText);
                    }
                    const eggToHatch = eggs.find(egg => egg.name.toLowerCase() === args[1].toLowerCase());
                    if (!eggToHatch) {
                        const invalidEggText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Egg not found! Use: garden hatch to see available eggs.`
                        });
                        return chat.reply(invalidEggText);
                    }
                    let eggId;
                    try {
                        eggId = await Currencies._resolveItemId(eggToHatch.name);
                    } catch (error) {
                        const noEggText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have that egg! Check your inventory.`
                        });
                        return chat.reply(noEggText);
                    }
                    if (!inventory[eggId] || inventory[eggId].quantity <= 0) {
                        const noEggText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have enough ${eggToHatch.name}!`
                        });
                        return chat.reply(noEggText);
                    }
                    const hatchRewards = ["Carrot", "Daffodil", "Common Gnome Crate", "Trowel"];
                    const reward = hatchRewards[Math.floor(Math.random() * hatchRewards.length)];
                    let rewardId;
                    try {
                        rewardId = await Currencies._resolveItemId(reward);
                    } catch (error) {
                        await Currencies.createItem({
                            name: reward,
                            price: 50,
                            description: `A reward from hatching a ${eggToHatch.name}`,
                            category: reward.includes("Seed") ? "seed" : "cosmetic"
                        });
                        rewardId = await Currencies._resolveItemId(reward);
                    }
                    await Currencies.removeItem(senderID, eggId, 1);
                    await Currencies.addItem(senderID, rewardId, 1);
                    const hatchText = format({
                        title: 'Hatch 🥚',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You hatched a ${eggToHatch.name} and received a ${reward}!`
                    });
                    chat.reply(hatchText);
                    break;

                default:
                    const helpText = format({
                        title: 'Garden Help 📚',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Commands:\n- register <name>: Start your garden\n- plant <seed>: Plant a seed\n- harvest: Collect mature crops\n- shop <item>: Buy seeds or gear\n- decorate <item>: Place decorations\n- status: Check garden and weather\n- inventory: View your items\n- hatch <egg>: Hatch an egg for rewards`
                    });
                    chat.reply(helpText);
                    break;
            }
        } catch (error) {
            console.error('Error in garden command:', error);
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: error.stack || error.message || `Something went wrong! Please try again later.`
            });
            chat.reply(errorText);
        }
    }
};