const axios = require('axios');

module.exports = {
  config: {
    name: "garden",
    aliases: ["gag"],
    type: "game",
    author: "Black Nigga",
    role: 0,
    cooldowns: 5,
    description: "Manage your Grow A Garden farm, plant seeds, and sell crops",
    prefix: true
  },
  style: {
    title: {
      text_font: "bold",
      content: "〘 🌱 〙 Grow A Garden",
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
      const subcommand = args[0]?.toLowerCase();
      let userData = await Currencies.getData(senderID);
      let balance = userData.balance || 0;
      let inventory = userData.inventory || {};
      let playerName = userData.name || null;
      let crops = userData.crops || [];

      const API_BASE = "https://growagardenstock.com/api";
      const endpoints = {
        seeds: `${API_BASE}/stock?type=gear-seeds&ts=`,
        weather: `${API_BASE}/stock/weather?ts=${Date.now()}`
      };

      const itemData = {
        Carrot: { price: 50, growthTime: 60, baseYield: 100 },
        Corn: { price: 60, growthTime: 120, baseYield: 150 },
        Daffodil: { price: 70, growthTime: 90, baseYield: 120 },
        Strawberry: { price: 80, growthTime: 180, baseYield: 200 },
        Tomato: { price: 60, growthTime: 120, baseYield: 140 },
        Blueberry: { price: 90, growthTime: 240, baseYield: 250 }
      };

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
          await Currencies.setData(senderID, { name, balance: 1000, inventory: {}, crops: [] });
          const registerText = format({
            title: 'Register ✅',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Welcome, ${name}! You've started your garden with $1000.`
          });
          chat.reply(registerText);
          break;

        case "stock":
          const { data: stockData } = await axios.get(endpoints.seeds);
          const stockText = format({
            title: 'Seed Shop 🏪',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Seeds (Updated: ${new Date(stockData.updatedAt).toLocaleString()}):\n` +
                     (stockData.seeds.length > 0
                       ? stockData.seeds.map(seed => {
                           const seedName = seed.replace(/\s*\*\*x\d+\*\*/g, "").trim();
                           const quantity = seed.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const price = itemData[seedName]?.price || "Unknown";
                           return `${seedName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No seeds available")
          });
          chat.reply(stockText);
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
          if (!args[1]) {
            const buyHelpText = format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Usage: garden buy <seed>`
            });
            return chat.reply(buyHelpText);
          }
          const seedName = args.slice(1).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
          const quantityMatch = args.join(" ").match(/\*\*x(\d+)\*\*/);
          const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

          if (!itemData[seedName]) {
            const invalidSeedText = format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Seed "${seedName}" not found! Check stock with: garden stock`
            });
            return chat.reply(invalidSeedText);
          }

          const { data: stockDataBuy } = await axios.get(endpoints.seeds);
          if (!stockDataBuy.seeds.includes(`${seedName} **x${quantity}**`) && quantity > 1) {
            const notInStockText = format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `${seedName} x${quantity} is not in stock! Check: garden stock`
            });
            return chat.reply(notInStockText);
          }

          const totalCost = itemData[seedName].price * quantity;
          if (balance < totalCost) {
            const notEnoughText = format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You need $${totalCost} to buy ${seedName} x${quantity}! You have $${balance}.`
            });
            return chat.reply(notEnoughText);
          }

          let seedId;
          try {
            seedId = await Currencies._resolveItemId(seedName);
          } catch (error) {
            await Currencies.createItem({
              name: seedName,
              price: itemData[seedName].price,
              description: `A ${seedName.toLowerCase()} seed for planting`,
              category: "seed"
            });
            seedId = await Currencies._resolveItemId(seedName);
          }

          await Currencies.buyItem(senderID, seedId, quantity);
          const buyText = format({
            title: 'Buy 🛒',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You bought ${seedName} x${quantity} for $${totalCost}! New balance: $${(balance - totalCost).toLocaleString()}`
          });
          chat.reply(buyText);
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
          const plantSeedName = args.slice(1).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
          let seedId;
          try {
            seedId = await Currencies._resolveItemId(plantSeedName);
          } catch (error) {
            const noSeedText = format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You don't have ${plantSeedName}! Check your inventory with: garden inventory`
            });
            return chat.reply(noSeedText);
          }
          if (!inventory[seedId] || inventory[seedId].quantity <= 0) {
            const noSeedText = format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You don't have ${plantSeedName}! Check your inventory with: garden inventory`
            });
            return chat.reply(noSeedText);
          }
          if (crops.length >= 10) {
            const plotFullText = format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Your garden is full! Harvest or sell crops first with: garden harvest`
            });
            return chat.reply(plotFullText);
          }

          const { data: weatherData } = await axios.get(endpoints.weather);
          let growthTime = itemData[plantSeedName].growthTime;
          if (weatherData.currentWeather.includes("Rain")) {
            growthTime *= 0.8;
          }

          await Currencies.removeItem(senderID, seedId, 1);
          crops.push({
            seedId,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000
          });
          await Currencies.setData(senderID, { crops });
          const plantText = format({
            title: 'Plant 🌱',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You planted a ${plantSeedName}! It will be ready to harvest in ${Math.ceil(growthTime)} seconds.` +
                     (weatherData.currentWeather.includes("Rain") ? `\nRain is speeding up growth!` : "")
          });
          chat.reply(plantText);
          break;

        case "harvest":
          if (crops.length === 0) {
            const noCropsText = format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You have no crops growing! Plant seeds with: garden plant <seed>`
            });
            return chat.reply(noCropsText);
          }

          const { data: weatherDataHarvest } = await axios.get(endpoints.weather);
          let totalYield = 0;
          const harvestedCrops = [];
          const remainingCrops = [];
          const now = Date.now();

          for (const crop of crops) {
            const seedName = (await Currencies.getItem(crop.seedId)).name;
            const isReady = now >= crop.plantedAt + crop.growthTime;
            if (isReady) {
              let yieldValue = itemData[seedName].baseYield;
              const mutationChance = Math.random();
              let mutation = "None";
              if (weatherDataHarvest.currentWeather.includes("Rain") && mutationChance < 0.5) {
                mutation = "Wet";
                yieldValue *= 2;
              } else if (weatherDataHarvest.currentWeather.includes("Thunderstorm") && mutationChance < 0.3) {
                mutation = "Shocked";
                yieldValue *= 3;
              } else if (weatherDataHarvest.currentWeather.includes("Snow") && mutationChance < 0.2) {
                mutation = mutationChance < 0.1 ? "Frozen" : "Chilled";
                yieldValue *= mutation === "Frozen" ? 10 : 2;
              } else if (mutationChance < 0.01) {
                mutation = "Gold";
                yieldValue *= 20;
              } else if (mutationChance < 0.001) {
                mutation = "Rainbow";
                yieldValue *= 100;
              }
              totalYield += yieldValue;
              harvestedCrops.push(`${seedName} (${mutation})`);
            } else {
              remainingCrops.push(crop);
            }
          }

          if (harvestedCrops.length === 0) {
            const notReadyText = format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `No crops are ready yet! Check back later or use: garden status`
            });
            return chat.reply(notReadyText);
          }

          await Currencies.increaseMoney(senderID, totalYield);
          await Currencies.setData(senderID, { crops: remainingCrops });
          const harvestText = format({
            title: 'Harvest 🌾',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You harvested: ${harvestedCrops.join(", ")}\nEarned: $${totalYield.toLocaleString()}\nNew balance: $${(balance + totalYield).toLocaleString()}`
          });
          chat.reply(harvestText);
          break;

        case "status":
          if (crops.length === 0) {
            const noCropsText = format({
              title: 'Status 📊',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You have no crops growing! Plant seeds with: garden plant <seed>`
            });
            return chat.reply(noCropsText);
          }

          const nowStatus = Date.now();
          const cropStatus = [];
          for (const crop of crops) {
            const seedName = (await Currencies.getItem(crop.seedId)).name;
            const timeLeft = Math.max(0, Math.ceil((crop.plantedAt + crop.growthTime - nowStatus) / 1000));
            cropStatus.push(`${seedName}: ${timeLeft > 0 ? `${timeLeft} seconds left` : "Ready to harvest"}`);
          }
          const statusText = format({
            title: 'Status 📊',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Growing Crops:\n${cropStatus.join("\n")}\nUse: garden harvest to collect ready crops`
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
            content: `Player: ${playerName}\n` +
                     (inventoryItems.length > 0
                       ? `Seeds: ${inventoryItems.join(", ")}`
                       : "Your inventory is empty!")
          });
          chat.reply(inventoryText);
          break;

        case "profile":
          const profileText = format({
            title: 'Profile 👤',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Name: ${playerName}\nBalance: $${balance.toLocaleString()}\nSeeds: ${Object.keys(inventory).length}\nGrowing Crops: ${crops.length}`
          });
          chat.reply(profileText);
          break;

        default:
          const helpText = format({
            title: 'Menu ℹ️',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `**Available commands**:\n` +
                     `- garden register <name>\n` +
                     `- garden stock\n` +
                     `- garden weather\n` +
                     `- garden buy <seed>\n` +
                     `- garden plant <seed>\n` +
                     `- garden harvest\n` +
                     `- garden status\n` +
                     `- garden inventory\n` +
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