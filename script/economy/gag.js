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
            const args = event.body?.trim().split(" ").slice(1) || [];
            const subcommand = args[0]?.toLowerCase();
            let userData = await Currencies.getData(senderID) || {};
            let balance = userData.balance || 0;
            let garden = userData.garden || { crops: [], decorations: [] };
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            // Weather cache to reduce API calls
            const weatherCache = {};
            async function getWeather() {
                if (weatherCache.lastUpdated && Date.now() - weatherCache.lastUpdated < 300000) {
                    return weatherCache.data;
                }
                try {
                    const weatherResponse = await axios.get('https://growagardenstock.com/api/stock/weather', apiConfig);
                    weatherCache.data = weatherResponse.data;
                    weatherCache.lastUpdated = Date.now();
                    return weatherCache.data;
                } catch (error) {
                    console.error('Weather API error:', error.message);
                    return { currentWeather: 'Unknown', effectDescription: 'No weather data available' };
                }
            }

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
                    'Cookie': 'dannyNotificationDismissed1=true; _ga=GA1.1.1068361458.1748996221; usprivacy=1---; pwBotScore=98; ad_clicker=false; _sharedid=3fa9d628-aa44-4919-b77f-a6f00dadef42; _sharedid_cst=zix7LPQsHA%3D%3D; _li_dcdm_c=.growagarden.gg; _lc2_fpi=86c7975c3383--01jww4rwre9wyzfc6fe6fmt0sv; _lc2_fpi_meta=%7B%22w%22%3A1748996223761%7D; _cc_id=54f6844c29987b05fc29258e28877501; panoramaId=f53e28a3bb2b6e04ceff755d6574185ca02c8089a4b47b2092a92bf07b79820b; panoramaId_expiry=1749601025877; panoramaIdType=panoDevice; connectId={"ttl":86400000,"lastUsed":1748996226110,"lastSynced":1748996226110}; __gads=ID=8261e8b4a0dac8b3:T=1748996227:RT=1748996227:S=ALNI_MazAunvuWez9Fk4Q81PWI3S1yQTqg; __eoi=ID=aa247d947aa355b0:T=1748996227:RT=1748996227:S=AA-AfjZv3VqL0BtOBiw9RC0vLo7k; _ga_5D3G90M88H=GS2.1.s1748996220$o1$g1$t1748996407$j24$l0$h0; _ga_RQP7JYRJS8=GS2.1.s1748996220$o1$g1$t1748996407$j24$l0$h0; cto_bundle=wcIRtl9NRmg2ZGVqUG05SGxUb0tVcEglMkIwNkJoWE90MzBWTWJSS1kwRzVIRllCMDYwY0ZwYTMxUkVuek11UzhCNERqUDJRNnZPR25uUFRuZE1BQjJoYkhFYTBZZzd1Um9QN3FKczglMkJLNSUyRnVRdzhROG1DYktVV25WQkIzS05nWm9ScyUyQnpTbEdwWTdQY0tOeFU0TmlocUJzRnhsWWJBdjFDSWhXZGpQWFlLMk9BcjYweDBGYnJuU0xRdWYxTUtPS2hOdDdtU2FibjdHbE9sMDhOYjklMkJXaXBVJTJGYWVxQW5KUlN3NFZwNFZWRVI3REswbk8lMkZQQnY3bDZaVGxtMnBnWFJnSUtKS3E; cto_bidid=OZNn5V9pOUNhaTdHbWpCQmhLZlB0Vm81TjhPTE04eCUyQkFrYmtIWSUyRm1jaTlGOGV0WVNmTldGZ2l1UTRXbWhHMDNZRnBSQXpNTkVVRUg4RFRadGZ0U2pybDY2bk9wblVWdEtkMmNqdXJqekhZWHIwbUxzaEYlMkJWWUdyN0YwN1NwZnBPN1VQRg'
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
                    userData = { name, balance: 100, garden: { crops: [], decorations: [] }, inventory: {} };
                    await Currencies.setData(senderID, userData).then(() => {
                        console.log(`Registered user ${senderID} with name ${name}`);
                    });
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
                    const seedName = args.slice(1).join(" ").trim();
                    let seedId;
                    try {
                        seedId = await Currencies._resolveItemId(seedName);
                    } catch (error) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have the seed "${seedName}"! Check your inventory with: garden inventory`
                        });
                        return chat.reply(noSeedText);
                    }
                    if (!inventory[seedId] || inventory[seedId].quantity <= 0) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have enough ${seedName} seeds!`
                        });
                        return chat.reply(noSeedText);
                    }
                    const seedDetails = await Currencies.getItem(seedId);
                    const growthTime = seedDetails.metadata?.growthTime 
                        ? parseInt(seedDetails.metadata.growthTime) * 60000 
                        : 600000; // Default 10 minutes
                    await Currencies.removeItem(senderID, seedId, 1);
                    inventory[seedId].quantity -= 1;
                    if (inventory[seedId].quantity === 0) delete inventory[seedId];
                    garden.crops.push({ name: seedDetails.name, plantedAt: Date.now(), growthTime });
                    userData.garden = garden;
                    userData.inventory = inventory;
                    await Currencies.setData(senderID, userData).then(() => {
                        console.log(`Planted ${seedDetails.name} for ${senderID}:`, JSON.stringify(userData));
                    });
                    const plantText = format({
                        title: 'Plant 🌱',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You planted a ${seedDetails.name} seed! It will be ready to harvest in ${growthTime / 60000} minutes.`
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
                    const weather = await getWeather();
                    for (const crop of readyCrops) {
                        const itemDetails = (await axios.get(`https://growagarden.gg/api/v1/items/Gag/all?page=1&sortBy=position`, apiConfig)).data.items.find(i => i.name.toLowerCase() === crop.name.toLowerCase());
                        let sellValue = itemDetails?.metadata?.sellValue ? parseInt(String(itemDetails.metadata.sellValue).replace(/[^0-9]/g, '')) || 20 : 20;
                        if (weather.currentWeather === "Snow Alert!") {
                            const rand = Math.random();
                            if (rand < 0.1) sellValue *= 10; // Freeze fruit
                            else if (rand < 0.3) sellValue *= 2; // Chill fruit
                        }
                        await Currencies.increaseMoney(senderID, sellValue);
                        balance += sellValue;
                        harvestResults.push(`${crop.name}: $${sellValue}`);
                    }
                    garden.crops = garden.crops.filter(crop => now - crop.plantedAt < crop.growthTime);
                    userData.garden = garden;
                    userData.balance = balance;
                    await Currencies.setData(senderID, userData);
                    const harvestText = format({
                        title: 'Harvest 🌾',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You harvested:\n${harvestResults.join("\n")}\nNew balance: $${balance.toLocaleString()}`
                    });
                    chat.reply(harvestText);
                    break;

                case "shop":
                    const shopResponse = await axios.get('https://growagardenstock.com/api/stock?type=gear-seeds', apiConfig).catch(err => {
                        console.error('Shop API error:', err.message);
                        return { data: { seeds: [], gear: [] } };
                    });
                    const shopItems = [...(shopResponse.data.seeds || []), ...(shopResponse.data.gear || [])].map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) || 1 };
                    });
                    if (!args[1]) {
                        const itemDetailsResponse = await axios.get('https://growagarden.gg/api/v1/items/Gag/all?page=1&sortBy=position', apiConfig).catch(err => {
                            console.error('Item details API error:', err.message);
                            return { data: { items: [] } };
                        });
                        const itemDetails = itemDetailsResponse.data.items || [];
                        const shopText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available items:\n${shopItems.map(item => {
                                const details = itemDetails.find(i => i.name.toLowerCase() === item.name.toLowerCase());
                                if (!details) {
                                    console.warn(`No details for item: ${item.name}`);
                                    return `${item.name} x${item.quantity} (Price unavailable)`;
                                }
                                const price = details.metadata?.buyPrice 
                                    ? parseInt(String(details.metadata.buyPrice).replace(/[^0-9]/g, '')) || 50 
                                    : 50;
                                return `${item.name} x${item.quantity} ($${price})`;
                            }).join("\n")}\nUse: garden shop <item>`
                        });
                        return chat.reply(shopText);
                    }
                    const itemToBuyName = args.slice(1).join(" ").trim();
                    const itemToBuy = shopItems.find(item => item.name.toLowerCase() === itemToBuyName.toLowerCase());
                    if (!itemToBuy) {
                        const invalidItemText = format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item "${itemToBuyName}" not found! Use: garden shop to see available items.`
                        });
                        return chat.reply(invalidItemText);
                    }
                    const itemDetails = (await axios.get(`https://growagarden.gg/api/v1/items/Gag/all?page=1&sortBy=position`, apiConfig)).data.items.find(i => i.name.toLowerCase() === itemToBuy.name.toLowerCase());
                    if (!itemDetails) {
                        return chat.reply(format({
                            title: 'Shop 🏪',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item details for "${itemToBuy.name}" not found!`
                        }));
                    }
                    const price = parseInt(String(itemDetails.metadata?.buyPrice).replace(/[^0-9]/g, '')) || 50;
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
                    inventory[shopItemId] = inventory[shopItemId] || { quantity: 0 };
                    inventory[shopItemId].quantity += 1;
                    balance -= price;
                    userData.balance = balance;
                    userData.inventory = inventory;
                    await Currencies.setData(senderID, userData);
                    const buyText = format({
                        title: 'Shop 🏪',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought a ${itemToBuy.name} for $${price}! New balance: $${balance.toLocaleString()}`
                    });
                    chat.reply(buyText);
                    break;

                case "decorate":
                    const cosmeticsResponse = await axios.get('https://growagardenstock.com/api/special-stock?type=cosmetics', apiConfig).catch(err => {
                        console.error('Cosmetics API error:', err.message);
                        return { data: { cosmetics: [] } };
                    });
                    const cosmetics = cosmeticsResponse.data.cosmetics.map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) || 1 };
                    });
                    if (!args[1]) {
                        const decorateHelpText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available decorations:\n${cosmetics.map(item => `${item.name} x${item.quantity}`).join("\n")}\nUse: garden decorate <item>`
                        });
                        return chat.reply(decorateHelpText);
                    }
                    const decorationName = args.slice(1).join(" ").trim();
                    const decoration = cosmetics.find(item => item.name.toLowerCase() === decorationName.toLowerCase());
                    if (!decoration) {
                        const invalidDecorationText = format({
                            title: 'Decorate 🎨',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Decoration "${decorationName}" not found! Use: garden decorate to see available decorations.`
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
                    inventory[decorationId].quantity -= 1;
                    if (inventory[decorationId].quantity === 0) delete inventory[decorationId];
                    garden.decorations.push({ name: decoration.name, placedAt: Date.now() });
                    userData.garden = garden;
                    userData.inventory = inventory;
                    await Currencies.setData(senderID, userData);
                    const decorateText = format({
                        title: 'Decorate 🎨',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You placed a ${decoration.name} in your garden!`
                    });
                    chat.reply(decorateText);
                    break;

                case "status":
                    userData = await Currencies.getData(senderID) || {};
                    console.log(`Status userData for ${senderID}:`, JSON.stringify(userData));
                    garden = userData.garden || { crops: [], decorations: [] };
                    const weather = await getWeather();
                    const cropStatus = garden.crops.length > 0 
                        ? garden.crops.map(crop => {
                            const timeLeft = Math.ceil((crop.growthTime - (Date.now() - crop.plantedAt)) / 60000);
                            return `${crop.name}: ${timeLeft > 0 ? `${timeLeft} minutes left` : "Ready to harvest"}`;
                        })
                        : ["No crops planted (check if planting was successful)"];
                    const decorationList = garden.decorations.map(deco => deco.name).join(", ") || "None";
                    const statusText = format({
                        title: 'Garden Status 🌳',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Player: ${playerName}\nBalance: $${balance.toLocaleString()}\nWeather: ${weather.currentWeather} (${weather.effectDescription})\nCrops:\n${cropStatus.join("\n")}\nDecorations: ${decorationList}`
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
                    const eggResponse = await axios.get('https://growagardenstock.com/api/stock?type=egg', apiConfig).catch(err => {
                        console.error('Egg API error:', err.message);
                        return { data: { egg: [] } };
                    });
                    const eggs = eggResponse.data.egg.map(item => {
                        const [name, quantity] = item.split(" **x");
                        return { name, quantity: parseInt(quantity) || 1 };
                    });
                    if (!args[1]) {
                        const hatchHelpText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Available eggs:\n${eggs.map(egg => `${egg.name} x${egg.quantity}`).join("\n")}\nUse: garden hatch <egg>`
                        });
                        return chat.reply(hatchHelpText);
                    }
                    const eggName = args.slice(1).join(" ").trim();
                    const eggToHatch = eggs.find(egg => egg.name.toLowerCase() === eggName.toLowerCase());
                    if (!eggToHatch) {
                        const invalidEggText = format({
                            title: 'Hatch 🥚',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Egg "${eggName}" not found! Use: garden hatch to see available eggs.`
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
                        const rewardDetails = (await axios.get(`https://growagarden.gg/api/v1/items/Gag/all?page=1&sortBy=position`, apiConfig)).data.items.find(i => i.name.toLowerCase() === reward.toLowerCase());
                        await Currencies.createItem({
                            name: reward,
                            price: rewardDetails?.metadata?.buyPrice ? parseInt(String(rewardDetails.metadata.buyPrice).replace(/[^0-9]/g, '')) || 50 : 50,
                            description: `A reward from hatching a ${eggToHatch.name}`,
                            category: rewardDetails?.metadata?.type === "Crop" ? "seed" : "cosmetic",
                            metadata: rewardDetails?.metadata || {}
                        });
                        rewardId = await Currencies._resolveItemId(reward);
                    }
                    await Currencies.removeItem(senderID, eggId, 1);
                    inventory[eggId].quantity -= 1;
                    if (inventory[eggId].quantity === 0) delete inventory[eggId];
                    inventory[rewardId] = inventory[rewardId] || { quantity: 0 };
                    inventory[rewardId].quantity += 1;
                    userData.inventory = inventory;
                    await Currencies.setData(senderID, userData);
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
            console.error('Error in garden command:', error.message);
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: error.message || `Something went wrong! Please try again later.`
            });
            chat.reply(errorText);
        }
    }
};