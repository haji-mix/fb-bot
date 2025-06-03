const axios = require('axios');

module.exports = {
    config: {
        name: "garden",
        aliases: ["gag"],
        type: "economy",
        author: "Black Nigga",
        role: 0,
        cooldowns: 5,
        description: "Manage your Grow A Garden farm and track shop stock",
        prefix: true
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 🌱 〙 Grow A Garden",
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
            let inventory = userData.inventory || {};
            let playerName = userData.name || null;

            // API base URL and endpoints
            const API_BASE = "https://growagardenstock.com/api";
            const endpoints = {
                cosmetics: `${API_BASE}/special-stock?type=cosmetics&ts=`,
                bloodTwilight: `${API_BASE}/special-stock?type=blood-twilight&ts=`,
                egg: `${API_BASE}/stock?type=egg&ts=`,
                gearSeeds: `${API_BASE}/stock?type=gear-seeds&ts=`,
                weather: `${API_BASE}/stock/weather?ts=${Date.now()}`
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
                    await Currencies.setData(senderID, { name, balance: 1000, inventory: {} });
                    const registerText = format({
                        title: 'Register ✅',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Welcome, ${name}! You've started your garden with 1000 Sheckles.`
                    });
                    chat.reply(registerText);
                    break;

                case "stock":
                    const shopType = args[1]?.toLowerCase() || "all";
                    let stockText = "";
                    if (shopType === "cosmetics" || shopType === "all") {
                        const { data } = await axios.get(endpoints.cosmetics);
                        stockText += `Cosmetics Shop (Updated: ${new Date(data.updatedAt).toLocaleString()}):\n${data.cosmetics.length > 0 ? data.cosmetics.join(", ") : "No items available"}\n\n`;
                    }
                    if (shopType === "blood-twilight" || shopType === "all") {
                        const { data } = await axios.get(endpoints.bloodTwilight);
                        stockText += `Blood Moon Shop:\n${Object.keys(data.blood).length > 0 ? Object.entries(data.blood).map(([item, qty]) => `${item} x${qty}`).join(", ") : "No items available"}\n\n`;
                        stockText += `Twilight Shop:\n${Object.keys(data.twilight).length > 0 ? Object.entries(data.twilight).map(([item, qty]) => `${item} x${qty}`).join(", ") : "No items available"}\n\n`;
                    }
                    if (shopType === "egg" || shopType === "all") {
                        const { data } = await axios.get(endpoints.egg);
                        stockText += `Egg Shop (Updated: ${new Date(data.updatedAt).toLocaleString()}):\n${data.egg.length > 0 ? data.egg.join(", ") : "No items available"}\n\n`;
                    }
                    if (shopType === "gear-seeds" || shopType === "all") {
                        const { data } = await axios.get(endpoints.gearSeeds);
                        stockText += `Gear Shop (Updated: ${new Date(data.updatedAt).toLocaleString()}):\n${data.gear.length > 0 ? data.gear.join(", ") : "No items available"}\n\n`;
                        stockText += `Seed Shop (Updated: ${new Date(data.updatedAt).toLocaleString()}):\n${data.seeds.length > 0 ? data.seeds.join(", ") : "No items available"}\n\n`;
                    }
                    const stockReply = format({
                        title: 'Shop Stock 🏪',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: stockText || `No stock available for ${shopType}! Use: garden stock [cosmetics|blood-twilight|egg|gear-seeds|all]`
                    });
                    chat.reply(stockReply);
                    break;

                case "weather":
                    const { data: weatherData } = await axios.get(endpoints.weather);
                    const weatherText = format({
                        title: 'Weather ☁️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Current Weather: ${weatherData.currentWeather} ${weatherData.icon}\n` +
                                 `Description: ${weatherData.description}\n` +
                                 `Effect: ${weatherData.effectDescription}\n` +
                                 `Crop Bonuses: ${weatherData.cropBonuses}\n` +
                                 `Mutations: ${weatherData.mutations.length > 0 ? weatherData.mutations.join(", ") : "None"}\n` +
                                 `Rarity: ${weatherData.rarity}\n` +
                                 `Updated: ${new Date(weatherData.updatedAt).toLocaleString()}`
                    });
                    chat.reply(weatherText);
                    break;

                case "buy":
                    if (!args[1] || !args[2]) {
                        const buyHelpText = format({
                            title: 'Buy 🛒',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Usage: garden buy <shop> <item>`
                        });
                        return chat.reply(buyHelpText);
                    }
                    const buyShop = args[1].toLowerCase();
                    const itemName = args.slice(2).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
                    const quantityMatch = args.join(" ").match(/\*\*x(\d+)\*\*/);
                    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

                    const itemPrices = {
                        "Common Gnome Crate": 500,
                        "Ring Walkway": 200,
                        "Large Wood Table": 300,
                        "Torch": 100,
                        "Shovel Grave": 150,
                        "Medium Circle Tile": 100,
                        "Yellow Umbrella": 250,
                        "Mini TV": 400,
                        "Axe Stump": 200,
                        "Common Egg": 300,
                        "Uncommon Egg": 600,
                        "Favorite Tool": 150,
                        "Trowel": 100,
                        "Basic Sprinkler": 200,
                        "Watering Can": 150,
                        "Lightning Rod": 500,
                        "Recall Wrench": 400,
                        "Carrot": 50,
                        "Corn": 60,
                        "Daffodil": 70,
                        "Strawberry": 80,
                        "Tomato": 60,
                        "Blueberry": 90
                    };

                    if (!itemPrices[itemName]) {
                        const invalidItemText = format({
                            title: 'Buy 🛒',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Item "${itemName}" not found! Check stock with: garden stock`
                        });
                        return chat.reply(invalidItemText);
                    }

                    // Check if item is in stock
                    let stockData;
                    if (buyShop === "cosmetics") {
                        stockData = (await axios.get(endpoints.cosmetics)).data.cosmetics;
                    } else if (buyShop === "egg") {
                        stockData = (await axios.get(endpoints.egg)).data.egg;
                    } else if (buyShop === "gear") {
                        stockData = (await axios.get(endpoints.gearSeeds)).data.gear;
                    } else if (buyShop === "seeds") {
                        stockData = (await axios.get(endpoints.gearSeeds)).data.seeds;
                    } else {
                        const invalidShopText = format({
                            title: 'Buy 🛒',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Invalid shop! Use: cosmetics, egg, gear, or seeds`
                        });
                        return chat.reply(invalidShopText);
                    }

                    if (!stockData.includes(`${itemName} **x${quantity}**`) && quantity > 1) {
                        const notInStockText = format({
                            title: 'Buy 🛒',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `${itemName} x${quantity} is not in stock! Check: garden stock ${buyShop}`
                        });
                        return chat.reply(notInStockText);
                    }

                    const totalCost = itemPrices[itemName] * quantity;
                    if (balance < totalCost) {
                        const notEnoughText = format({
                            title: 'Buy 🛒',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You need ${totalCost} Sheckles to buy ${itemName} x${quantity}! You have ${balance} Sheckles.`
                        });
                        return chat.reply(notEnoughText);
                    }

                    let itemId;
                    try {
                        itemId = await Currencies._resolveItemId(itemName);
                    } catch (error) {
                        await Currencies.createItem({
                            name: itemName,
                            price: itemPrices[itemName],
                            description: `A ${itemName.toLowerCase()} from the ${buyShop} shop`,
                            category: buyShop
                        });
                        itemId = await Currencies._resolveItemId(itemName);
                    }

                    await Currencies.buyItem(senderID, itemId, quantity);
                    const buyText = format({
                        title: 'Buy 🛒',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You bought ${itemName} x${quantity} for ${totalCost} Sheckles! New balance: ${(balance - totalCost).toLocaleString()} Sheckles`
                    });
                    chat.reply(buyText);
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

                case "plant":
                    if (!args[1]) {
                        const plantHelpText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `Specify a seed to plant! Use: garden plant <seed>`
                        });
                        return chat.reply(plantHelpText);
                    }
                    const seedName = args.slice(1).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
                    let seedId;
                    try {
                        seedId = await Currencies._resolveItemId(seedName);
                    } catch (error) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have ${seedName}! Check your inventory with: garden inventory`
                        });
                        return chat.reply(noSeedText);
                    }
                    if (!inventory[seedId] || inventory[seedId].quantity <= 0) {
                        const noSeedText = format({
                            title: 'Plant 🌱',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            content: `You don't have ${seedName}! Check your inventory with: garden inventory`
                        });
                        return chat.reply(noSeedText);
                    }
                    await Currencies.removeItem(senderID, seedId, 1);
                    const cropYield = Math.floor(Math.random() * 100) + 50; 
                    await Currencies.increaseMoney(senderID, cropYield);
                    const plantText = format({
                        title: 'Plant 🌱',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `You planted a ${seedName} and harvested crops worth ${cropYield} Sheckles! New balance: ${(balance + cropYield).toLocaleString()} Sheckles`
                    });
                    chat.reply(plantText);
                    break;

                case "profile":
                    const profileText = format({
                        title: 'Profile 👤',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `Name: ${playerName}\nBalance: ${balance.toLocaleString()} Sheckles\nInventory Items: ${Object.keys(inventory).length}`
                    });
                    chat.reply(profileText);
                    break;

                default:
                    const helpText = format({
                        title: 'Menu ℹ️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        content: `**Available commands**:\n` +
                                 `- garden register <name>\n` +
                                 `- garden stock [cosmetics|blood-twilight|egg|gear-seeds|all]\n` +
                                 `- garden weather\n` +
                                 `- garden buy <shop> <item>\n` +
                                 `- garden inventory\n` +
                                 `- garden plant <seed>\n` +
                                 `- garden profile`
                    });
                    chat.reply(helpText);
            }
        } catch (error) {
            console.error(error);
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `An error occurred while processing your command. Please try again later.`
            });
            chat.reply(errorText);
        }
    }
};