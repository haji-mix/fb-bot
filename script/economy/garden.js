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
      const { senderID } = event || {};
      const { Currencies } = Utils || {};
      const args = event.body?.split(/\s+/).slice(1) || [];
      const subcommand = args[0]?.toLowerCase() || "";

      // Initialize user data
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

      const itemMaps = {
        seeds: Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        gear: Object.keys(itemData.gear).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        eggs: Object.keys(itemData.eggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        cosmetics: Object.keys(itemData.cosmetics).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})
      };

      let stockCache = { data: null, timestamp: 0 };
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

      const getStockData = async (endpoint) => {
        if (stockCache.data && Date.now() - stockCache.timestamp < CACHE_DURATION) {
          return stockCache.data;
        }
        const response = await axios.get(endpoint).catch(() => ({ data: {} }));
        stockCache = { data: response.data, timestamp: Date.now() };
        return response.data;
      };

      const getItemDetails = (itemType, itemName) => {
        const canonicalName = itemMaps[itemType]?.[itemName.toLowerCase()] || itemName;
        const itemDetails = itemData[`${itemType}s`]?.[canonicalName];
        return itemDetails ? { canonicalName, ...itemDetails } : null;
      };

      const findItemInStock = (stockItems, itemName, quantity) => {
        const lowerItemName = itemName.toLowerCase().trim();
        for (const stockItem of stockItems) {
          if (!stockItem) continue;
          const stockItemName = stockItem.replace(/\*\*x\d+\*\*/, "").trim().toLowerCase();
          const stockQuantity = parseInt(stockItem.match(/\*\*x(\d+)\*\*/)?.[1] || 1);
          if (stockItemName === lowerItemName && stockQuantity >= quantity) {
            return true;
          }
        }
        return itemData.seeds?.[itemName] || itemData.gear?.[itemName] || itemData.eggs?.[itemName] || itemData.cosmetics?.[itemName];
      };

      const displayStock = (items, itemType, itemMap) => {
        if (!items?.length) return `No ${itemType}s available`;
        return items.map(item => {
          const itemName = item?.replace(/\*\*x\d+\*\*/, "").trim() || "Unknown";
          const quantity = item?.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
          const canonicalName = itemMap[itemName.toLowerCase()] || itemName;
          const price = itemData[itemType + 's']?.[canonicalName]?.price || 0;
          return `${canonicalName} x${quantity} ($${price} each)`;
        }).join("\n");
      };

      if (subcommand !== "register" && !playerName) {
        return chat.reply(format({
          title: 'Register 🚫',
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          content: `You need to register first! Use: #garden register <name>`
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
              content: `Please provide a name! Usage: #garden register <name>`
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
          let stockData = { seeds: [], gear: [], eggs: [], cosmetics: [], bloodTwilight: { blood: {}, twilight: {} }, updatedAt: Date.now() };
          try {
            const [seedGearResponse, eggResponse, cosmeticResponse, bloodTwilightResponse] = await Promise.all([
              getStockData(endpoints.seeds),
              getStockData(endpoints.eggs),
              getStockData(endpoints.cosmetics),
              getStockData(endpoints.bloodTwilight)
            ]);
            stockData = {
              seeds: seedGearResponse.seeds || [],
              gear: seedGearResponse.gear || [],
              eggs: eggResponse.egg || [],
              cosmetics: cosmeticResponse.cosmetics || [],
              bloodTwilight: bloodTwilightResponse || { blood: {}, twilight: {} },
              updatedAt: seedGearResponse.updatedAt || Date.now()
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
            content: `**Seeds** (Updated: ${new Date(stockData.updatedAt).toLocaleString()}):\n` +
                     displayStock(stockData.seeds, 'seed', itemMaps.seeds) +
                     `\n\n**Gear**:\n` + displayStock(stockData.gear, 'gear', itemMaps.gear) +
                     `\n\n**Eggs**:\n` + displayStock(stockData.eggs, 'egg', itemMaps.eggs) +
                     `\n\n**Cosmetics**:\n` + displayStock(stockData.cosmetics, 'cosmetic', itemMaps.cosmetics) +
                     `\n\n**Blood/Twilight Events**:\n` +
                     (Object.keys(stockData.bloodTwilight.blood || {}).length > 0 || Object.keys(stockData.bloodTwilight.twilight || {}).length > 0
                       ? `Blood: ${JSON.stringify(stockData.bloodTwilight.blood || {})}\nTwilight: ${JSON.stringify(stockData.bloodTwilight.twilight || {})}`
                       : "No event items available")
          }));

        case "weather":
          let weatherData = { currentWeather: 'Clear', icon: '', description: 'N/A', effectDescription: 'None', cropBonuses: 'None', mutations: [], rarity: 'Common', updatedAt: Date.now() };
          try {
            const response = await getStockData(endpoints.weather);
            weatherData = response || weatherData;
          } catch (error) {
            return chat.reply(format({
              title: 'Weather Error ❌',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Failed to fetch weather data. Try again later.'
            }));
          }
          return chat.reply(format({
            title: 'Weather 🌦️',
            titlePattern: '{emojis} ${UNIRedux.arrow} {word}',
            content: `Current Weather: ${weatherData.currentWeather || 'N/A'} ${weatherData.icon || ''}\n` +
                     `Description: ${weatherData.description || 'N/A'}\n` +
                     `Effect: ${weatherData.effectDescription || 'None'}\n` +
                     `Crop Bonuses: ${weatherData.cropBonuses || 'None'}\n` +
                     `Mutations: ${weatherData.mutations?.length > 0 ? weatherData.mutations.join(', ') : 'None'}\n` +
                     `Rarity: ${weatherData.rarity || 'Common'}\n` +
                     `Updated: ${new Date(weatherData.updatedAt || Date.now()).toLocaleString()}`
          }));

        case "buy":
          if (!args[1] || !args[2]) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Usage: buy <type> <item> (e.g., #garden buy seed Carrot)'
            }));
          }
          const itemType = args[1].toLowerCase();
          const itemName = args.slice(2).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
          const quantity = parseInt(args.join(' ').match(/\*\*x(\d+)\*\*/)?.[1] || 1);
          const itemDetails = getItemDetails(itemType, itemName);

          if (!['seed', 'gear', 'egg', 'cosmetic'].includes(itemType)) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Invalid item type! Use: seed, gear, egg, or cosmetic'
            }));
          }

          if (!itemDetails) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Item '${itemName}' not found! Check stock with: #garden stock`
            }));
          }

          const { canonicalName, price } = itemDetails;
          if (!price) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Price for ${canonicalName} is unknown! Contact support or try again later.`
            }));
          }

          let stockDataBuy = {};
          try {
            const endpoint = itemType === 'cosmetic' ? endpoints.cosmetics : 
                           itemType === 'egg' ? endpoints.eggs : 
                           endpoints.seeds;
            stockDataBuy = await getStockData(endpoint);
          } catch (error) {
            return chat.reply(format({
              title: 'Buy Error ❌',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Failed to fetch stock data. Try again later.'
            }));
          }

          const stockItems = itemType === 'cosmetic' ? stockDataBuy.cosmetics || [] : 
                           itemType === 'egg' ? stockDataBuy.egg || [] : 
                           stockDataBuy[`${itemType}s`] || [];

          if (!findItemInStock(stockItems, canonicalName, quantity)) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `${canonicalName} x${quantity} is not in stock! Check: #garden stock`
            }));
          }

          const totalCost = price * quantity;
          if (balance < totalCost) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You need $${totalCost} to buy ${canonicalName} x${quantity}! You have $${balance}.`
            }));
          }

          inventory[`${itemType}s`][canonicalName] = (inventory[`${itemType}s`][canonicalName] || 0) + quantity;
          balance -= totalCost;
          await Currencies.setData(senderID, { balance, inventory });
          return chat.reply(format({
            title: 'Buy 🛒',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You bought ${canonicalName} x${quantity} (${itemType}) for $${totalCost}! New balance: $${balance.toLocaleString()}`
          }));

        case "plant":
          if (!args[1]) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Specify a seed to plant! Use: #garden plant <seed>'
            }));
          }
          const plantSeedName = args.slice(1).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
          const seedDetails = getItemDetails('seed', plantSeedName);

          if (!seedDetails) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Seed '${plantSeedName}' not found! Check available seeds with: #garden stock`
            }));
          }

          const { canonicalName } = seedDetails;
          if (!inventory.seeds[canonicalName] || inventory.seeds[canonicalName] <= 0) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You don't have ${canonicalName} seeds! Check your inventory with: #garden inventory`
            }));
          }

          if (crops.length >= 10) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Your garden is full! Harvest or sell crops first with: #garden harvest'
            }));
          }

          let weatherDataPlant = { currentWeather: 'Clear', mutations: [] };
          try {
            const response = await getStockData(endpoints.weather);
            weatherDataPlant = response || weatherDataPlant;
          } catch (error) {
            // Fallback to default weather data
          }

          let growthTime = seedDetails.growthTime || 60;
          let mutationChance = 0.1;

          if (weatherDataPlant.currentWeather?.includes('Rain')) {
            growthTime *= 0.8;
            mutationChance += 0.1;
          }
          if (inventory.gear['Basic Sprinkler']) {
            growthTime *= 0.9;
            mutationChance += 0.05;
          }

          inventory.seeds[canonicalName] -= 1;
          if (inventory.seeds[canonicalName] === 0) {
            delete inventory.seeds[canonicalName];
          }

          crops.push({
            seedName: canonicalName,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000,
            regrows: seedDetails.regrows || false
          });

          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(format({
            title: 'Plant 🌱',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Planted ${canonicalName}! Growth time: ${Math.round(growthTime)} seconds.`
          }));

        default:
          return chat.reply(format({
            title: 'Garden 🌱',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Available commands: register, stock, weather, buy, plant`
          }));
      }
    } catch (error) {
      console.error(error);
      return chat.reply(format({
        title: 'Error ❌',
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        content: 'An error occurred. Please try again later.'
      }));
    }
  }
};