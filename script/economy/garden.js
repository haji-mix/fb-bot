const axios = require('axios');

module.exports = {
  config: {
    name: "garden",
    aliases: ["gag"],
    type: "game",
    author: "Black Nigga",
    role: 0,
    cooldowns: 5,
    description: "Manage your Grow A Garden farm, plant seeds, buy gear, eggs, cosmetics, and sell crops",
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
      const args = event.body?.split(/\s+/).slice(1) || [];
      const subcommand = args[0]?.toLowerCase() || "";
      let userData = (await Currencies.getData(senderID)) || {};
      let balance = userData.balance || 0;
      let inventory = userData.inventory || { seeds: {}, gear: {}, eggs: {}, cosmetics: {} };
      let playerName = userData.name || null;
      let crops = userData.crops || [];

      const API_BASE = "https://growagardenstock.com/api";
      const endpoints = {
        seeds: `${API_BASE}/stock?type=gear-seeds&ts=${Date.now()}`,
        eggs: `${API_BASE}/stock?type=egg&ts=${Date.now()}`,
        cosmetics: `${API_BASE}/special-stock?type=cosmetics&ts=${Date.now()}`,
        bloodTwilight: `${API_BASE}/special-stock?type=blood-twilight&ts=${Date.now()}`,
        weather: `${API_BASE}/stock/weather?ts=${Date.now()}`
      };

      const itemData = {
        seeds: {
          Carrot: { price: 50, growthTime: 60, baseYield: 100, regrows: false },
          Corn: { price: 60, growthTime: 120, baseYield: 150, regrows: false },
          Daffodil: { price: 70, growthTime: 90, baseYield: 120, regrows: false },
          Strawberry: { price: 80, growthTime: 180, baseYield: 200, regrows: true },
          Tomato: { price: 60, growthTime: 120, baseYield: 140, regrows: true },
          Blueberry: { price: 90, growthTime: 240, baseYield: 250, regrows: true }
        },
        gear: {
          "Favorite Tool": { price: 100, effect: "Increases mutation chance" },
          Trowel: { price: 50, effect: "Speeds up planting" },
          "Basic Sprinkler": { price: 20000, effect: "Increases crop size" },
          "Watering Can": { price: 150, effect: "Reduces growth time" },
          "Lightning Rod": { price: 500, effect: "Boosts thunderstorm mutations" },
          "Recall Wrench": { price: 300, effect: "Recalls pets" }
        },
        eggs: {
          "Common Egg": { price: 200, hatchTime: 300 },
          "Uncommon Egg": { price: 500, hatchTime: 600 }
        },
        cosmetics: {
          "Common Gnome Crate": { price: 100 },
          "Ring Walkway": { price: 150 },
          "Large Wood Table": { price: 200 },
          Torch: { price: 80 },
          "Shovel Grave": { price: 120 },
          "Medium Circle Tile": { price: 90 },
          "Yellow Umbrella": { price: 130 },
          "Mini TV": { price: 180 },
          "Axe Stump": { price: 110 }
        }
      };

      if (subcommand !== "register" && !playerName) {
        return chat.reply(format({
          title: 'Register 🚫',
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          content: `You need to register first! Use: garden register <name>`
        }));
      }

      switch (subcommand) {
        case "register":
          if (playerName) {
            return chat.reply(format({
              title: 'Register 📝',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You are already registered as ${playerName}!`
            }));
          }
          const name = args.slice(1).join(" ").trim();
          if (!name) {
            return chat.reply(format({
              title: 'Register 🚫',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Please provide a name! Usage: garden register <name>`
            }));
          }
          await Currencies.setData(senderID, {
            name,
            balance: 1000,
            inventory: { seeds: {}, gear: {}, eggs: {}, cosmetics: {} },
            crops: []
          });
          return chat.reply(format({
            title: 'Register ✅',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Welcome, ${name}! You've started your garden with $1000.`
          }));

        case "stock":
          let stockData;
          try {
            const [seedGearResponse, eggResponse, cosmeticResponse, bloodTwilightResponse] = await Promise.all([
              axios.get(endpoints.seeds),
              axios.get(endpoints.eggs),
              axios.get(endpoints.cosmetics),
              axios.get(endpoints.bloodTwilight)
            ]);
            stockData = {
              seeds: seedGearResponse.data.seeds,
              gear: seedGearResponse.data.gear,
              eggs: eggResponse.data.egg,
              cosmetics: cosmeticResponse.data.cosmetics,
              bloodTwilight: bloodTwilightResponse.data
            };
          } catch (error) {
            return chat.reply(format({
              title: 'Stock Error ❌',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Failed to fetch stock data. Please try again later.`
            }));
          }
          return chat.reply(format({
            title: 'Shop 🏪',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `**Seeds** (Updated: ${new Date(stockData.seeds.updatedAt || Date.now()).toLocaleString()}):\n` +
                     (stockData.seeds?.length > 0
                       ? stockData.seeds.map(seed => {
                           const seedName = seed.replace(/\s*\*\*x\d+\*\*/g, "").trim();
                           const quantity = seed.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const price = itemData.seeds[seedName]?.price || "Unknown";
                           return `${seedName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No seeds available") +
                     `\n\n**Gear**:\n` +
                     (stockData.gear?.length > 0
                       ? stockData.gear.map(gear => {
                           const gearName = gear.replace(/\s*\*\*x\d+\*\*/g, "").trim();
                           const quantity = gear.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const price = itemData.gear[gearName]?.price || "Unknown";
                           return `${gearName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No gear available") +
                     `\n\n**Eggs**:\n` +
                     (stockData.eggs?.length > 0
                       ? stockData.eggs.map(egg => {
                           const eggName = egg.replace(/\s*\*\*x\d+\*\*/g, "").trim();
                           const quantity = egg.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const price = itemData.eggs[eggName]?.price || "Unknown";
                           return `${eggName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No eggs available") +
                     `\n\n**Cosmetics**:\n` +
                     (stockData.cosmetics?.length > 0
                       ? stockData.cosmetics.map(cosmetic => {
                           const cosmeticName = cosmetic.replace(/\s*\*\*x\d+\*\*/g, "").trim();
                           const quantity = cosmetic.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const price = itemData.cosmetics[cosmeticName]?.price || "Unknown";
                           return `${cosmeticName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No cosmetics available") +
                     `\n\n**Blood/Twilight Events**:\n` +
                     (stockData.bloodTwilight.blood || stockData.bloodTwilight.twilight
                       ? `Blood: ${JSON.stringify(stockData.bloodTwilight.blood)}\nTwilight: ${JSON.stringify(stockData.bloodTwilight.twilight)}`
                       : "No event items available")
          }));

        case "weather":
          let weatherData;
          try {
            const response = await axios.get(endpoints.weather);
            weatherData = response.data;
          } catch (error) {
            return chat.reply(format({
              title: 'Weather Error ❌',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Failed to fetch weather data. Please try again later.`
            }));
          }
          return chat.reply(format({
            title: 'Weather ☁️',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Current Weather: ${weatherData.currentWeather} ${weatherData.icon || ""}\n` +
                     `Description: ${weatherData.description || "N/A"}\n` +
                     `Effect: ${weatherData.effectDescription || "None"}\n` +
                     `Crop Bonuses: ${weatherData.cropBonuses || "None"}\n` +
                     `Mutations: ${weatherData.mutations?.length > 0 ? weatherData.mutations.join(", ") : "None"}\n` +
                     `Rarity: ${weatherData.rarity || "Common"}\n` +
                     `Updated: ${new Date(weatherData.updatedAt).toLocaleString()}`
          }));

        case "buy":
          if (!args[1] || !args[2]) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Usage: garden buy <type> <item> (e.g., garden buy seed Carrot)`
            }));
          }
          const itemType = args[1].toLowerCase();
          const itemName = args.slice(2).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
          const quantityMatch = args.join(" ").match(/\*\*x(\d+)\*\*/);
          const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

          if (!["seed", "gear", "egg", "cosmetic"].includes(itemType)) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Invalid item type! Use: seed, gear, egg, or cosmetic`
            }));
          }

          const typeKey = itemType + "s";
          if (!itemData[typeKey][itemName]) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Item "${itemName}" not found! Check stock with: garden stock`
            }));
          }

          let stockDataBuy;
          try {
            const endpoint = itemType === "cosmetic" ? endpoints.cosmetics : itemType === "egg" ? endpoints.eggs : endpoints.seeds;
            const response = await axios.get(endpoint);
            stockDataBuy = response.data;
          } catch (error) {
            return chat.reply(format({
              title: 'Buy Error ❌',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Failed to fetch stock data. Please try again later.`
            }));
          }

          const stockItems = itemType === "cosmetic" ? stockDataBuy.cosmetics : itemType === "egg" ? stockDataBuy.egg : stockDataBuy[typeKey];
          if (!stockItems.includes(`${itemName} **x${quantity}**`) && quantity > 1) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `${itemName} x${quantity} is not in stock! Check: garden stock`
            }));
          }

          const totalCost = itemData[typeKey][itemName].price * quantity;
          if (balance < totalCost) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You need $${totalCost} to buy ${itemName} x${quantity}! You have $${balance}.`
            }));
          }

          inventory[typeKey][itemName] = (inventory[typeKey][itemName] || 0) + quantity;
          balance -= totalCost;
          await Currencies.setData(senderID, { balance, inventory });
          return chat.reply(format({
            title: 'Buy 🛒',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You bought ${itemName} x${quantity} (${itemType}) for $${totalCost}! New balance: $${balance.toLocaleString()}`
          }));

        case "plant":
          if (!args[1]) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Specify a seed to plant! Use: garden plant <seed>`
            }));
          }
          const plantSeedName = args.slice(1).join(" ").replace(/\s*\*\*x\d+\*\*/g, "").trim();
          if (!itemData.seeds[plantSeedName] || !inventory.seeds[plantSeedName] || inventory.seeds[plantSeedName] <= 0) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You don't have ${plantSeedName}! Check your inventory with: garden inventory`
            }));
          }
          if (crops.length >= 10) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Your garden is full! Harvest or sell crops first with: garden harvest`
            }));
          }

          let weatherDataPlant;
          try {
            const response = await axios.get(endpoints.weather);
            weatherDataPlant = response.data;
          } catch (error) {
            weatherDataPlant = { currentWeather: "Clear", mutations: [] };
          }
          let growthTime = itemData.seeds[plantSeedName].growthTime;
          let mutationChance = 0.1;
          if (weatherDataPlant.currentWeather.includes("Rain")) {
            growthTime *= 0.8;
            mutationChance += 0.1;
          }
          if (inventory.gear["Basic Sprinkler"]) {
            growthTime *= 0.9;
            mutationChance += 0.05;
          }

          inventory.seeds[plantSeedName] -= 1;
          if (inventory.seeds[plantSeedName] === 0) delete inventory.seeds[plantSeedName];
          crops.push({
            seedName: plantSeedName,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000,
            regrows: itemData.seeds[plantSeedName].regrows
          });
          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(format({
            title: 'Plant 🌱',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You planted a ${plantSeedName}! It will be ready to harvest in ${Math.ceil(growthTime)} seconds.` +
                     (weatherDataPlant.currentWeather.includes("Rain") ? `\nRain is speeding up growth!` : "") +
                     (inventory.gear["Basic Sprinkler"] ? `\nSprinkler is boosting growth!` : "")
          }));

        case "harvest":
          if (crops.length === 0) {
            return chat.reply(format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You have no crops growing! Plant seeds with: garden plant <seed>`
            }));
          }

          let weatherDataHarvest;
          try {
            const response = await axios.get(endpoints.weather);
            weatherDataHarvest = response.data;
          } catch (error) {
            weatherDataHarvest = { currentWeather: "Clear", mutations: [] };
          }
          let totalYield = 0;
          const harvestedCrops = [];
          const remainingCrops = [];
          const now = Date.now();

          for (const crop of crops) {
            const seedName = crop.seedName;
            const isReady = now >= crop.plantedAt + crop.growthTime;
            if (isReady) {
              let yieldValue = itemData.seeds[seedName].baseYield;
              const mutationChance = Math.random();
              let mutations = [];
              if (weatherDataHarvest.currentWeather.includes("Rain") && mutationChance < 0.5) {
                mutations.push("Wet");
                yieldValue *= 2;
              }
              if (weatherDataHarvest.currentWeather.includes("Thunderstorm") && mutationChance < 0.3) {
                mutations.push("Shocked");
                yieldValue *= 3;
              }
              if (weatherDataHarvest.currentWeather.includes("Snow") && mutationChance < 0.2) {
                mutations.push(mutationChance < 0.1 ? "Frozen" : "Chilled");
                yieldValue *= mutationChance < 0.1 ? 10 : 2;
              }
              if (mutationChance < 0.01) {
                mutations.push("Gold");
                yieldValue *= 20;
              }
              if (mutationChance < 0.001) {
                mutations.push("Rainbow");
                yieldValue *= 50;
              }
              if (inventory.gear["Basic Sprinkler"] && mutationChance < 0.15) {
                mutations.push("Large");
                yieldValue *= 2;
              }
              totalYield += yieldValue;
              harvestedCrops.push(`${seedName} (${mutations.length > 0 ? mutations.join(", ") : "None"})`);
              if (crop.regrows) {
                crop.plantedAt = Date.now();
                remainingCrops.push(crop);
              }
            } else {
              remainingCrops.push(crop);
            }
          }

          if (harvestedCrops.length === 0) {
            return chat.reply(format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `No crops are ready yet! Check back later or use: garden status`
            }));
          }

          balance += totalYield;
          await Currencies.setData(senderID, { balance, crops: remainingCrops });
          return chat.reply(format({
            title: 'Harvest 🌾',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You harvested: ${harvestedCrops.join(", ")}\nEarned: $${totalYield.toLocaleString()}\nNew balance: $${balance.toLocaleString()}`
          }));

        case "status":
          if (crops.length === 0) {
            return chat.reply(format({
              title: 'Status 📊',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You have no crops growing! Plant seeds with: garden plant <seed>`
            }));
          }

          const nowStatus = Date.now();
          const cropStatus = crops.map(crop => {
            const timeLeft = Math.max(0, Math.ceil((crop.plantedAt + crop.growthTime - nowStatus) / 1000));
            return `${crop.seedName}: ${timeLeft > 0 ? `${timeLeft} seconds left` : "Ready to harvest"}`;
          });
          return chat.reply(format({
            title: 'Status 📊',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Growing Crops:\n${cropStatus.join("\n")}\nUse: garden harvest to collect ready crops`
          }));

        case "inventory":
          return chat.reply(format({
            title: 'Inventory 🎒',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Player: ${playerName}\n` +
                     `**Seeds**:\n${Object.entries(inventory.seeds).length > 0
                       ? Object.entries(inventory.seeds).map(([seed, qty]) => `${seed}: ${qty}`).join("\n")
                       : "No seeds"}\n` +
                     `**Gear**:\n${Object.entries(inventory.gear).length > 0
                       ? Object.entries(inventory.gear).map(([gear, qty]) => `${gear}: ${qty}`).join("\n")
                       : "No gear"}\n` +
                     `**Eggs**:\n${Object.entries(inventory.eggs).length > 0
                       ? Object.entries(inventory.eggs).map(([egg, qty]) => `${egg}: ${qty}`).join("\n")
                       : "No eggs"}\n` +
                     `**Cosmetics**:\n${Object.entries(inventory.cosmetics).length > 0
                       ? Object.entries(inventory.cosmetics).map(([cosmetic, qty]) => `${cosmetic}: ${qty}`).join("\n")
                       : "No cosmetics"}`
          }));

        case "profile":
          return chat.reply(format({
            title: 'Profile 👤',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Name: ${playerName}\nBalance: $${balance.toLocaleString()}\n` +
                     `Seeds: ${Object.keys(inventory.seeds).length}\nGear: ${Object.keys(inventory.gear).length}\n` +
                     `Eggs: ${Object.keys(inventory.eggs).length}\nCosmetics: ${Object.keys(inventory.cosmetics).length}\n` +
                     `Growing Crops: ${crops.length}`
          }));

        default:
          return chat.reply(format({
            title: 'Menu ℹ️',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `**Available commands**:\n` +
                     `- garden register <name>\n` +
                     `- garden stock\n` +
                     `- garden weather\n` +
                     `- garden buy <type> <item> (e.g., seed Carrot, gear Basic Sprinkler)\n` +
                     `- garden plant <seed>\n` +
                     `- garden harvest\n` +
                     `- garden status\n` +
                     `- garden inventory\n` +
                     `- garden profile`
          }));
      }
    } catch (error) {
      console.error("Garden Command Error:", error);
      return chat.reply(format({
        title: 'Error ❌',
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        content: `An error occurred while processing your command. Please try again later.`
      }));
    }
  }
};