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
      
      // Initialize user data with defaults
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

      // Default prices for items if not found in stock
      const DEFAULT_PRICES = {
        seeds: {
          Carrot: 50,
          Corn: 60,
          Daffodil: 70,
          Strawberry: 80,
          Tomato: 60,
          Blueberry: 90
        },
        gear: {
          "Favorite Tool": 100,
          Trowel: 50,
          "Basic Sprinkler": 20000,
          "Watering Can": 150,
          "Lightning Rod": 500,
          "Recall Wrench": 300
        },
        eggs: {
          "Common Egg": 200,
          "Uncommon Egg": 500
        },
        cosmetics: {
          "Common Gnome Crate": 100,
          "Ring Walkway": 150,
          "Large Wood Table": 200,
          Torch: 80,
          "Shovel Grave": 120,
          "Medium Circle Tile": 90,
          "Yellow Umbrella": 130,
          "Mini TV": 180,
          "Axe Stump": 110
        }
      };

      const itemData = {
        seeds: {
          Carrot: { price: DEFAULT_PRICES.seeds.Carrot, growthTime: 60, baseYield: 100, regrows: false },
          Corn: { price: DEFAULT_PRICES.seeds.Corn, growthTime: 120, baseYield: 150, regrows: false },
          Daffodil: { price: DEFAULT_PRICES.seeds.Daffodil, growthTime: 90, baseYield: 120, regrows: false },
          Strawberry: { price: DEFAULT_PRICES.seeds.Strawberry, growthTime: 180, baseYield: 200, regrows: true },
          Tomato: { price: DEFAULT_PRICES.seeds.Tomato, growthTime: 120, baseYield: 140, regrows: true },
          Blueberry: { price: DEFAULT_PRICES.seeds.Blueberry, growthTime: 240, baseYield: 250, regrows: true }
        },
        gear: {
          "Favorite Tool": { price: DEFAULT_PRICES.gear["Favorite Tool"], effect: "Increases mutation chance" },
          Trowel: { price: DEFAULT_PRICES.gear.Trowel, effect: "Speeds up planting" },
          "Basic Sprinkler": { price: DEFAULT_PRICES.gear["Basic Sprinkler"], effect: "Increases crop size" },
          "Watering Can": { price: DEFAULT_PRICES.gear["Watering Can"], effect: "Reduces growth time" },
          "Lightning Rod": { price: DEFAULT_PRICES.gear["Lightning Rod"], effect: "Boosts thunderstorm mutations" },
          "Recall Wrench": { price: DEFAULT_PRICES.gear["Recall Wrench"], effect: "Recalls pets" }
        },
        eggs: {
          "Common Egg": { price: DEFAULT_PRICES.eggs["Common Egg"], hatchTime: 300 },
          "Uncommon Egg": { price: DEFAULT_PRICES.eggs["Uncommon Egg"], hatchTime: 600 }
        },
        cosmetics: {
          "Common Gnome Crate": { price: DEFAULT_PRICES.cosmetics["Common Gnome Crate"] },
          "Ring Walkway": { price: DEFAULT_PRICES.cosmetics["Ring Walkway"] },
          "Large Wood Table": { price: DEFAULT_PRICES.cosmetics["Large Wood Table"] },
          Torch: { price: DEFAULT_PRICES.cosmetics.Torch },
          "Shovel Grave": { price: DEFAULT_PRICES.cosmetics["Shovel Grave"] },
          "Medium Circle Tile": { price: DEFAULT_PRICES.cosmetics["Medium Circle Tile"] },
          "Yellow Umbrella": { price: DEFAULT_PRICES.cosmetics["Yellow Umbrella"] },
          "Mini TV": { price: DEFAULT_PRICES.cosmetics["Mini TV"] },
          "Axe Stump": { price: DEFAULT_PRICES.cosmetics["Axe Stump"] }
        }
      };

      const itemMaps = {
        seeds: Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        gear: Object.keys(itemData.gear).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        eggs: Object.keys(itemData.eggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        cosmetics: Object.keys(itemData.cosmetics).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {})
      };

      // Helper function to find item in stock
      const findItemInStock = (stockItems, itemName, quantity) => {
        const lowerItemName = itemName.toLowerCase();
        for (const stockItem of stockItems) {
          const stockItemName = stockItem?.replace(/\*\*x\d+\*\*/, "").trim().toLowerCase();
          const stockQuantity = parseInt(stockItem?.match(/\*\*x(\d+)\*\*/)?.[1] || 1);
          if (stockItemName === lowerItemName && stockQuantity >= quantity) {
            return true;
          }
        }
        return false;
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
              axios.get(endpoints.seeds).catch(() => ({ data: { seeds: [], gear: [] } })),
              axios.get(endpoints.eggs).catch(() => ({ data: { egg: [] } })),
              axios.get(endpoints.cosmetics).catch(() => ({ data: { cosmetics: [] } })),
              axios.get(endpoints.bloodTwilight).catch(() => ({ data: { blood: {}, twilight: {} } }))
            ]);
            stockData = {
              seeds: seedGearResponse.data.seeds || [],
              gear: seedGearResponse.data.gear || [],
              eggs: eggResponse.data.egg || [],
              cosmetics: cosmeticResponse.data.cosmetics || [],
              bloodTwilight: bloodTwilightResponse.data || { blood: {}, twilight: {} },
              updatedAt: seedGearResponse.data.updatedAt || Date.now()
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
                     (stockData.seeds.length > 0
                       ? stockData.seeds.map(seed => {
                           const seedName = seed?.replace(/\*\*x\d+\*\*/, "").trim() || "Unknown";
                           const quantity = seed?.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const canonicalName = itemMaps.seeds[seedName.toLowerCase()] || seedName;
                           const price = itemData.seeds[canonicalName]?.price || DEFAULT_PRICES.seeds[canonicalName] || "Unknown";
                           return `${canonicalName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No seeds available") +
                     `\n\n**Gear**:\n` +
                     (stockData.gear.length > 0
                       ? stockData.gear.map(gear => {
                           const gearName = gear?.replace(/\*\*x\d+\*\*/, "").trim() || "Unknown";
                           const quantity = gear?.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const canonicalName = itemMaps.gear[gearName.toLowerCase()] || gearName;
                           const price = itemData.gear[canonicalName]?.price || DEFAULT_PRICES.gear[canonicalName] || "Unknown";
                           return `${canonicalName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No gear available") +
                     `\n\n**Eggs**:\n` +
                     (stockData.eggs.length > 0
                       ? stockData.eggs.map(egg => {
                           const eggName = egg?.replace(/\*\*x\d+\*\*/, "").trim() || "Unknown";
                           const quantity = egg?.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const canonicalName = itemMaps.eggs[eggName.toLowerCase()] || eggName;
                           const price = itemData.eggs[canonicalName]?.price || DEFAULT_PRICES.eggs[canonicalName] || "Unknown";
                           return `${canonicalName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No eggs available") +
                     `\n\n**Cosmetics**:\n` +
                     (stockData.cosmetics.length > 0
                       ? stockData.cosmetics.map(cosmetic => {
                           const cosmeticName = cosmetic?.replace(/\*\*x\d+\*\*/, "").trim() || "Unknown";
                           const quantity = cosmetic?.match(/\*\*x(\d+)\*\*/)?.[1] || 1;
                           const canonicalName = itemMaps.cosmetics[cosmeticName.toLowerCase()] || cosmeticName;
                           const price = itemData.cosmetics[canonicalName]?.price || DEFAULT_PRICES.cosmetics[canonicalName] || "Unknown";
                           return `${canonicalName} x${quantity} ($${price} each)`;
                         }).join("\n")
                       : "No cosmetics available") +
                     `\n\n**Blood/Twilight Events**:\n` +
                     (Object.keys(stockData.bloodTwilight.blood || {}).length > 0 || Object.keys(stockData.bloodTwilight.twilight || {}).length > 0
                       ? `Blood: ${JSON.stringify(stockData.bloodTwilight.blood || {})}\nTwilight: ${JSON.stringify(stockData.bloodTwilight.twilight || {})}`
                       : "No event items available")
          }));

        case "weather":
          let weatherData = { currentWeather: 'Clear', icon: '', description: 'N/A', effectDescription: 'None', cropBonuses: 'None', mutations: [], rarity: 'Common', updatedAt: Date.now() };
          try {
            const response = await axios.get(endpoints.weather).catch(() => ({ data: {} }));
            weatherData = response.data || weatherData;
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
          const canonicalName = itemMaps[itemType]?.[itemName] || '';
          
          if (!['seed', 'gear', 'egg', 'cosmetic'].includes(itemType)) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'Invalid item type! Use: seed, gear, egg, or cosmetic'
            }));
          }
          
          if (!canonicalName) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Item '${itemName}' not found! Check stock with: #garden stock`
            }));
          }
          
          // Use default price if item data not found
          const itemPrice = itemData[`${itemType}s`]?.[canonicalName]?.price || 
                          DEFAULT_PRICES[`${itemType}s`]?.[canonicalName] || 
                          0;
          
          let stockDataBuy = {};
          try {
            const endpoint = itemType === 'cosmetic' ? endpoints.cosmetics : 
                           itemType === 'egg' ? endpoints.eggs : 
                           endpoints.seeds;
            const response = await axios.get(endpoint).catch(() => ({ data: {} }));
            stockDataBuy = response.data || {};
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
          
          // Check if item exists in stock (case-insensitive)
          const itemExists = findItemInStock(stockItems, canonicalName, quantity);
          
          if (!itemExists) {
            return chat.reply(format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `${canonicalName} x${quantity} is not in stock! Check: #garden stock`
            }));
          }
          
          const totalCost = itemPrice * quantity;
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
          const canonicalSeedName = itemMaps.seeds[plantSeedName] || '';
          
          if (!canonicalSeedName) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Seed '${plantSeedName}' not found! Check available seeds with: #garden stock`
            }));
          }
          
          if (!inventory.seeds[canonicalSeedName] || inventory.seeds[canonicalSeedName] <= 0) {
            return chat.reply(format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You don't have ${canonicalSeedName} seeds! Check your inventory with: #garden inventory`
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
            const response = await axios.get(endpoints.weather).catch(() => ({ data: {} }));
            weatherDataPlant = response.data || weatherDataPlant;
          } catch (error) {
            // Fallback to default weather data
          }
          
          const seedData = itemData.seeds[canonicalSeedName] || {
            growthTime: 60,
            regrows: false
          };
          
          let growthTime = seedData.growthTime || 60;
          let mutationChance = 0.1;
          
          if (weatherDataPlant.currentWeather?.includes('Rain')) {
            growthTime *= 0.8;
            mutationChance += 0.1;
          }
          if (inventory.gear['Basic Sprinkler']) {
            growthTime *= 0.9;
            mutationChance += 0.05;
          }
          
          inventory.seeds[canonicalSeedName] -= 1;
          if (inventory.seeds[canonicalSeedName] === 0) {
            delete inventory.seeds[canonicalSeedName];
          }
          
          crops.push({
            seedName: canonicalSeedName,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000,
            regrows: seedData.regrows || false
          });
          
          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(format({
            title: 'Plant 🌱',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You planted a ${canonicalSeedName}! Ready to harvest in ${Math.ceil(growthTime)} seconds.` +
                     (weatherDataPlant.currentWeather?.includes('Rain') ? '\nRain is speeding up growth!' : '') +
                     (inventory.gear['Basic Sprinkler'] ? '\nSprinkler is boosting growth!' : '')
          }));

        case "harvest":
          if (!crops || crops.length === 0) {
            return chat.reply(format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'You have no crops growing! Plant seeds with: #garden plant <seed>'
            }));
          }
          
          let weatherDataHarvest = { currentWeather: 'Clear', mutations: [] };
          try {
            const response = await axios.get(endpoints.weather).catch(() => ({ data: {} }));
            weatherDataHarvest = response.data || weatherDataHarvest;
          } catch (error) {
            // Fallback to default weather data
          }
          
          let totalYield = 0;
          const harvestedCrops = [];
          const remainingCrops = [];
          const now = Date.now();
          
          for (const crop of crops) {
            if (!crop || !crop.seedName) continue; // Skip invalid crops
            
            const seedName = crop.seedName;
            const isReady = now >= (crop.plantedAt || 0) + (crop.growthTime || 0);
            
            if (isReady) {
              const seedData = itemData.seeds[seedName] || { baseYield: 100 };
              let yieldValue = seedData.baseYield || 100;
              const mutationChance = Math.random();
              let mutations = [];
              
              if (weatherDataHarvest.currentWeather?.includes('Rain') && mutationChance < 0.5) {
                mutations.push('Wet');
                yieldValue *= 2;
              }
              if (weatherDataHarvest.currentWeather?.includes('Thunderstorm') && mutationChance < 0.3) {
                mutations.push('Shocked');
                yieldValue *= 3;
              }
              if (weatherDataHarvest.currentWeather?.includes('Snow') && mutationChance < 0.2) {
                mutations.push(mutationChance < 0.1 ? 'Frozen' : 'Chilled');
                yieldValue *= mutationChance < 0.1 ? 10 : 2;
              }
              if (mutationChance < 0.01) {
                mutations.push('Gold');
                yieldValue *= 20;
              }
              if (mutationChance < 0.001) {
                mutations.push('Rainbow');
                yieldValue *= 50;
              }
              if (inventory.gear['Basic Sprinkler'] && mutationChance < 0.15) {
                mutations.push('Large');
                yieldValue *= 2;
              }
              
              totalYield += yieldValue;
              harvestedCrops.push(`${seedName} (${mutations.length > 0 ? mutations.join(', ') : 'None'})`);
              
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
              content: 'No crops are ready yet! Check back later or use: #garden status'
            }));
          }
          
          balance += totalYield;
          await Currencies.setData(senderID, { balance, crops: remainingCrops });
          return chat.reply(format({
            title: 'Harvest 🌾',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You harvested: ${harvestedCrops.join(', ')}\nEarned: $${totalYield.toLocaleString()}\nNew balance: $${balance.toLocaleString()}`
          }));

        case "status":
          if (!crops || crops.length === 0) {
            return chat.reply(format({
              title: 'Status 📊',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: 'You have no crops growing! Plant seeds with: #garden plant <seed>'
            }));
          }
          
          const nowStatus = Date.now();
          const cropStatus = crops.map(crop => {
            if (!crop || !crop.seedName) return 'Invalid crop';
            const timeLeft = Math.max(0, Math.ceil(((crop.plantedAt || 0) + (crop.growthTime || 0) - nowStatus) / 1000));
            return `${crop.seedName}: ${timeLeft > 0 ? `${timeLeft} seconds left` : 'Ready to harvest'}`;
          }).filter(status => status !== 'Invalid crop');
          
          return chat.reply(format({
            title: 'Status 📊',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Growing Crops:\n${cropStatus.length > 0 ? cropStatus.join('\n') : 'No valid crops'}\nUse: #garden harvest to collect ready crops`
          }));

        case "inventory":
          return chat.reply(format({
            title: 'Inventory 🎒',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Player: ${playerName || 'Unknown'}\n` +
                     `**Seeds**:\n${Object.entries(inventory.seeds || {}).length > 0
                       ? Object.entries(inventory.seeds).map(([seed, qty]) => `${seed}: ${qty}`).join('\n')
                       : 'No seeds'}\n` +
                     `**Gear**:\n${Object.entries(inventory.gear || {}).length > 0
                       ? Object.entries(inventory.gear).map(([gear, qty]) => `${gear}: ${qty}`).join('\n')
                       : 'No gear'}\n` +
                     `**Eggs**:\n${Object.entries(inventory.eggs || {}).length > 0
                       ? Object.entries(inventory.eggs).map(([egg, qty]) => `${egg}: ${qty}`).join('\n')
                       : 'No eggs'}\n` +
                     `**Cosmetics**:\n${Object.entries(inventory.cosmetics || {}).length > 0
                       ? Object.entries(inventory.cosmetics).map(([cosmetic, qty]) => `${cosmetic}: ${qty}`).join('\n')
                       : 'No cosmetics'}`
          }));

        case "profile":
          return chat.reply(format({
            title: 'Profile 👤',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `Name: ${playerName || 'Unknown'}\nBalance: $${balance.toLocaleString()}\n` +
                     `Seeds: ${Object.keys(inventory.seeds || {}).length}\nGear: ${Object.keys(inventory.gear || {}).length}\n` +
                     `Eggs: ${Object.keys(inventory.eggs || {}).length}\nCosmetics: ${Object.keys(inventory.cosmetics || {}).length}\n` +
                     `Growing Crops: ${crops?.length || 0}`
          }));

        default:
          return chat.reply(format({
            title: 'Menu ℹ️',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `**Available commands**:\n` +
                     `- garden register <name>\n` +
                     `- garden stock\n` +
                     `- garden weather\n` +
                     `- garden buy <type> <item> (e.g., seed Carrot)\n` +
                     `- garden plant <seed>\n` +
                     `- garden harvest\n` +
                     `- garden status\n` +
                     `- garden inventory\n` +
                     `- garden profile`
          }));
      }
    } catch (error) {
      return chat.reply(format({
        title: 'Error ❌',
        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
        content: error.stack || error.message || "Something Went Wrong!"
      }));
    }
  }
};