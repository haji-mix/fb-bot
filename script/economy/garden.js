module.exports = {
  config: {
    name: 'garden',
    aliases: ['gag'],
    type: 'game',
    author: 'Nigga',
    role: 0,
    cooldowns: 5,
    description: 'Manage your Grow A Garden farm: plant seeds, buy gear, eggs, cosmetics, hatch pets, feed pets, and wait for crops to grow',
    prefix: true,
  },
  style: {
    title: {
      text_font: 'bold',
      content: '〘 🌱 〙 Grow A Garden',
      line_bottom: 'default',
    },
    titleFont: 'bold',
    contentFont: 'fancy',
  },
  run: async ({ chat, event, Utils, format, UNIRedux }) => {
    try {
      const { senderID } = event;
      const { Currencies } = Utils;
      const args = (event.body || '').trim().split(/\s+/).slice(1);
      const subcommand = args[0]?.toLowerCase() || '';

      // Load user data with defaults
      let userData = (await Currencies.getData(senderID)) || {};
      let balance = userData.balance || 0;
      let inventory = userData.inventory || {
        seeds: {},
        gear: {},
        eggs: {},
        cosmetics: {},
        petEggs: {},
      };
      let playerName = userData.name || null;
      let crops = userData.crops || [];
      let pets = userData.pets || { active: [], stored: [] };
      let petSlots = userData.petSlots || 3;

      // Static item data
      const itemData = {
        seeds: {
          Carrot: { price: 50, growthTime: 60, baseYield: 100, regrows: false, foodValue: 20 },
          Corn: { price: 60, growthTime: 120, baseYield: 150, regrows: false, foodValue: 30 },
          Daffodil: { price: 70, growthTime: 90, baseYield: 120, regrows: false, foodValue: 15 },
          Strawberry: { price: 80, growthTime: 180, baseYield: 200, regrows: true, foodValue: 25 },
          Tomato: { price: 60, growthTime: 120, baseYield: 140, regrows: true, foodValue: 20 },
          Blueberry: { price: 90, growthTime: 240, baseYield: 250, regrows: true, foodValue: 30 },
          CandyBlossom: { price: 500, growthTime: 300, baseYield: 1000, regrows: false, foodValue: 50 },
          MoonMango: { price: 600, growthTime: 360, baseYield: 1200, regrows: false, foodValue: 60 },
        },
        gear: {
          'Favorite Tool': { price: 100, effect: 'Increases mutation chance' },
          Trowel: { price: 50, effect: 'Speeds up planting' },
          'Basic Sprinkler': { price: 20000, effect: 'Increases crop size' },
          'Watering Can': { price: 150, effect: 'Reduces growth time' },
          'Lightning Rod': { price: 500, effect: 'Boosts thunderstorm mutations' },
        },
        eggs: {
          'Common Egg': { price: 200, hatchTime: 300 },
          'Uncommon Egg': { price: 500, hatchTime: 600 },
        },
        cosmetics: {
          'Common Gnome Crate': { price: 100 },
          'Ring Walkway': { price: 150 },
          'Large Wood Table': { price: 200 },
          Torch: { price: 80 },
        },
        petEggs: {
          'Common Egg': { price: 50000, hatchTime: 1800, rarity: 'Common', hatchChance: 0.99 },
          'Uncommon Egg': { price: 150000, hatchTime: 3600, rarity: 'Uncommon', hatchChance: 0.53 },
          'Rare Egg': { price: 600000, hatchTime: 7200, rarity: 'Rare', hatchChance: 0.21 },
          'Legendary Egg': { price: 3000000, hatchTime: 14400, rarity: 'Legendary', hatchChance: 0.09 },
          'Bug Egg': { price: 50000000, hatchTime: 28800, rarity: 'Bug', hatchChance: 0.03 },
          'Mythical Egg': { price: 8000000, hatchTime: 21600, rarity: 'Mythical', hatchChance: 0.05 },
        },
      };

      // Static pet data with hunger decay rates
      const petData = {
        Dragonfly: { rarity: 'Bug', passive: 'Turns a random fruit into Glow (20x value) every 5 minutes', hatchChance: 0.01, egg: 'Bug Egg', hungerDecay: 1 },
        'Praying Mantis': { rarity: 'Bug', passive: 'Prays every 80s for a crop mutation', hatchChance: 0.05, egg: 'Bug Egg', hungerDecay: 1 },
        Raccoon: { rarity: 'Legendary', passive: 'Duplicates a random fruit from a neighbor’s garden every 15 minutes', hatchChance: 0.03, egg: 'Legendary Egg', hungerDecay: 2 },
        'Polar Bear': { rarity: 'Rare', passive: 'Chance to apply Chilled (2x value) or Frozen (2x value) mutation', hatchChance: 30, egg: 'Rare Egg', hungerDecay: 3 },
        'Red Giant Ant': { rarity: 'Mythical', passive: '5% chance to duplicate crops on harvest', hatchChance: 0.02, egg: 'Mythical Egg', hungerDecay: 2 },
        'Green Lab': { rarity: 'Common', passive: '5% case-insensitive chance to dig up a random seed', hatchChance: 33.3, egg: 'Common Egg', hungerDecay: 2 },
        Bunny: { rarity: 'Common', passive: 'Boosts carrot sell value by 1.5x', hatchChance: 0.3, egg: 'Common Egg', hungerDecay: 2, preferredFood: 'Carrot' },
      };

      // Static stock data
      const stockData = {
        seeds: ['Carrot **x10**', 'Corn **x8**', 'Daffodil **x5**', 'Strawberry **x3**', 'Tomato **x6**', 'Blueberry **x2**', 'CandyBlossom **x1**', 'MoonMango **x1**'],
        gear: ['Favorite Tool **x5**', 'Trowel **x10**', 'Basic Sprinkler **x1**', 'Watering Can **x3**', 'Lightning Rod **x2**'],
        eggs: ['Common Egg **x5**', 'Uncommon Egg **x2**'],
        cosmetics: ['Common Gnome Crate **x10**', 'Ring Walkway **x5**', 'Large Wood Table **x3**', 'Torch **x8**'],
        petEggs: ['Common Egg **x5**', 'Uncommon Egg **x3**', 'Rare Egg **x2**', 'Legendary Egg **x1**', 'Bug Egg **x1**', 'Mythical Egg **x1**'],
        bloodTwilight: { blood: {}, twilight: {} },
        updatedAt: Date.now(),
      };

      // Static weather data (rotates every 5 minutes)
      const weatherOptions = [
        { currentWeather: 'Clear', icon: '☀️', description: 'Sunny and calm', effectDescription: 'None', cropBonuses: 'None', mutations: [], rarity: 'Common' },
        { currentWeather Rain', icon: '🌧️', description: 'Wet and rainy', effectDescription: 'Reduces growth time by 20%', cropBonuses: 'All crops', mutations: ['Glow'], rarity: 'Uncommon' },
        { currentWeather: 'Thunderstorm', icon: '⛈️', description: 'Stormy with lightning', effectDescription: 'Increases mutation chance', cropBonuses: 'None', mutations: ['Electric'], rarity: 'Rare' },
      ];
      const weatherCycleDuration = 5 * 60 * 1000;
      const currentWeatherIndex = Math.floor(Date.now() / weatherCycleDuration) % weatherOptions.length;
      const weatherData = weatherOptions[currentWeatherIndex];

      // Item name mappings for case-insensitive lookup
      const itemMaps = {
        seeds: Object.keys(itemData.seeds).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        gear: Object.keys(itemData.gear).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        eggs: Object.keys(itemData.eggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        cosmetics: Object.keys(itemData.cosmetics).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
        petEggs: Object.keys(itemData.petEggs).reduce((map, key) => ({ ...map, [key.toLowerCase()]: key }), {}),
      };

      // Helper functions
      const getItemDetails = (itemType, itemName) => {
        const lowerItemName = itemName.toLowerCase().trim();
        const canonicalName = itemMaps[itemType]?.[lowerItemName] || itemName;
        return {
          canonicalName,
          ...(itemData[itemType]?.[canonicalName] || {}),
        };
      };

      const findItemInStock = (stockItems, itemName, quantity) => {
        if (!stockItems) return false;
        const lowerItemName = itemName.toLowerCase().trim();
        for (const stockItem of stockItems) {
          const stockItemName = stockItem.replace(/\*\*x\d+\*\*/, '').trim().toLowerCase();
          const stockQuantity = parseInt(stockItem.match(/\*\*x(\d+)\*\*/)?.[1] || 1);
          if (stockItemName === lowerItemName && stockQuantity >= quantity) {
            return true;
          }
        }
        return false;
      };

      const displayStock = (items, itemType, itemMap) => {
        if (!items?.length) return `No ${itemType} available`;
        return items
          .map((item) => {
            const itemName = item.replace(/\*\*x\d+\*\*/, '').trim();
            const quantity = parseInt(item.match(/\*\*x(\d+)\*\*/)?.[1] || 1);
            const canonicalName = itemMap[itemName.toLowerCase()] || itemName;
            const price = itemData[itemType]?.[canonicalName]?.price || 100;
            return `${canonicalName} x${quantity} ($${price} each)`;
          })
          .join('\n');
      };

      const hatchPet = (eggName) => {
        const canonicalEggName = itemMaps.petEggs[eggName.toLowerCase()] || eggName;
        const eggDetails = itemData.petEggs[canonicalEggName];
        if (!eggDetails) return null;
        const possiblePets = Object.keys(petData).filter((pet) => petData[pet].egg === canonicalEggName);
        let totalChance = possiblePets.reduce((sum, pet) => sum + petData[pet].hatchChance, 0);
        let rand = Math.random() * totalChance;
        for (const pet of possiblePets) {
          rand -= petData[pet].hatchChance;
          if (rand <= 0) {
            return {
              name: pet,
              age: 0,
              hunger: 100,
              xp: 0,
              passive: petData[pet].passive,
              rarity: petData[pet].rarity,
              lastUpdated: Date.now(),
            };
          }
        }
        return null;
      };

      const updatePetHunger = () => {
        const now = Date.now();
        const updatePet = (pet) => {
          if (!petData[pet.name]) return pet; // Skip invalid pets
          const timeElapsed = (now - pet.lastUpdated) / 1000 / 60; // Minutes
          pet.hunger = Math.max(0, pet.hunger - petData[pet.name].hungerDecay * timeElapsed);
          pet.lastUpdated = now;
          return pet;
        };
        pets.active = pets.active.map(updatePet);
        pets.stored = pets.stored.map(updatePet);
      };

      // Update pet hunger before processing commands
      updatePetHunger();
      await Currencies.setData(senderID, { ...userData, pets });

      // Command logic
      if (subcommand !== 'register' && !playerName) {
        return chat.reply(
          format({
            title: 'Register 🚫',
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            content: `You need to register first! Use: #garden register <name>`,
          })
        );
      }

      switch (subcommand) {
        case 'register': {
          if (playerName) {
            return chat.reply(
              format({
                title: 'Register 📝',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You are already registered as ${playerName} with $${balance.toLocaleString()}!`,
              })
            );
          }
          const name = args.slice(1).join(' ').trim();
          if (!name || name.length < 3) {
            return chat.reply(
              format({
                title: 'Register 🚫',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Please provide a valid name (at least 3 characters)! Usage: #garden register <name>`,
              })
            );
          }
          await Currencies.setData(senderID, {
            name,
            balance: 1000, // Free starting money
            inventory: {
              seeds: { Carrot: 5 }, // Starter seeds
              gear: {},
              eggs: {},
              cosmetics: {},
              petEggs: {},
            },
            crops: [],
            pets: { active: [], stored: [] },
            petSlots: 3,
          });
          return chat.reply(
            format({
              title: 'Register ✅',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Welcome, ${name}! You've started your garden with $1000 and 5 Carrot seeds. Buy more items with: #garden buy, or plant your seeds with: #garden plant Carrot`,
            })
          );
        }

        case 'stock': {
          return chat.reply(
            format({
              title: 'Shop 🏪',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content:
                `**Seeds** (Updated: ${new Date(stockData.updatedAt).toLocaleString()}):\n` +
                displayStock(stockData.seeds, 'seeds', itemMaps.seeds) +
                `\n\n**Gear**:\n` +
                displayStock(stockData.gear, 'gear', itemMaps.gear) +
                `\n\n**Eggs (Hatching)**:\n` +
                displayStock(stockData.eggs, 'eggs', itemMaps.eggs) +
                `\n\n**Cosmetics**:\n` +
                displayStock(stockData.cosmetics, 'cosmetics', itemMaps.cosmetics) +
                `\n\n**Pet Eggs**:\n` +
                displayStock(stockData.petEggs, 'petEggs', itemMaps.petEggs) +
                `\n\n**Blood/Twilight Events**:\n` +
                (Object.keys(stockData.bloodTwilight.blood).length > 0 || Object.keys(stockData.bloodTwilight.twilight).length > 0
                  ? `Blood: ${JSON.stringify(stockData.bloodTwilight.blood)}\nTwilight: ${JSON.stringify(stockData.bloodTwilight.twilight)}`
                  : 'No event items available'),
            })
          );
        }

        case 'weather': {
          return chat.reply(
            format({
              title: 'Weather 🌦️',
              titlePattern: '{emojis} ${UNIRedux.arrow} {word}',
              content:
                `Current Weather: ${weatherData.currentWeather} ${weatherData.icon}\n` +
                `Description: ${weatherData.description}\n` +
                `Effect: ${weatherData.effectDescription}\n` +
                `Crop Bonuses: ${weatherData.cropBonuses}\n` +
                `Mutations: ${weatherData.mutations.length > 0 ? weatherData.mutations.join(', ') : 'None'}\n` +
                `Rarity: ${weatherData.rarity}\n` +
                `Updated: ${new Date().toLocaleString()}`,
            })
          );
        }

        case 'buy': {
          if (!args[1] || !args[2]) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Usage: #garden buy <type> <item> [quantity] (e.g., #garden buy seed carrot 2 or #garden buy seed carrot)',
              })
            );
          }
          const itemType = args[1].toLowerCase();
          const quantityArg = args[args.length - 1];
          const quantityMatch = quantityArg.match(/\*\*x(\d+)\*\*/);
          const quantity = quantityMatch ? parseInt(quantityMatch[1]) : (isNaN(parseInt(quantityArg)) ? 1 : parseInt(quantityArg));
          const itemName = args.slice(2, isNaN(parseInt(quantityArg)) ? undefined : -1).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();

          if (!['seed', 'gear', 'egg', 'cosmetic', 'petEgg'].includes(itemType)) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Invalid item type! Use: seed, gear, egg, cosmetic, petEgg',
              })
            );
          }

          if (quantity <= 0 || isNaN(quantity)) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Invalid quantity! Must be a positive number.',
              })
            );
          }

          const itemDetails = getItemDetails(itemType + 's', itemName);
          const { canonicalName, price } = itemDetails;

          if (!itemData[itemType + 's']?.[canonicalName]) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Item '${itemName}' not found! Check available items with: #garden stock`,
              })
            );
          }

          const stockItems = stockData[itemType + 's'];
          if (!findItemInStock(stockItems, canonicalName, quantity)) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Not enough ${canonicalName} in stock for x${quantity}! Check: #garden stock`,
              })
            );
          }

          const totalCost = price * quantity;
          if (balance < totalCost) {
            const shortfall = totalCost - balance;
            const affordableQuantity = Math.floor(balance / price);
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Not enough money! You need $${totalCost} for ${canonicalName} x${quantity}, but you have $${balance}.\n` +
                         `Shortfall: $${shortfall}.\n` +
                         (affordableQuantity > 0 ? `You can afford ${canonicalName} x${affordableQuantity} for $${affordableQuantity * price}.\n` : '') +
                         `Earn more by harvesting crops with: #garden harvest, or plant seeds with: #garden plant`,
              })
            );
          }

          inventory[itemType + 's'] = inventory[itemType + 's'] || {};
          inventory[itemType + 's'][canonicalName] = (inventory[itemType + 's'][canonicalName] || 0) + quantity;
          balance -= totalCost;
          await Currencies.setData(senderID, { balance, inventory });
          return chat.reply(
            format({
              title: 'Buy 🛒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `You bought ${canonicalName} x${quantity} (${itemType}) for $${totalCost}! New balance: $${balance.toLocaleString()}`,
            })
          );
        }

        case 'plant': {
          if (!args[1]) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Specify a seed to plant! Use: #garden plant <seed>',
              })
            );
          }
          const plantSeedName = args.slice(1).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
          const seedDetails = getItemDetails('seeds', plantSeedName);

          if (!seedDetails.canonicalName || !itemData.seeds[seedDetails.canonicalName]) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Seed '${plantSeedName}' not found! Check available seeds with: #garden stock`,
              })
            );
          }

          const { canonicalName } = seedDetails;
          if (!inventory.seeds?.[canonicalName] || inventory.seeds[canonicalName] <= 0) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You don't have ${canonicalName} seeds! Buy more with: #garden buy seed ${canonicalName}`,
              })
            );
          }

          if (crops.length >= 10) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Your garden is full! Harvest crops first with: #garden harvest',
              })
            );
          }

          let growthTime = seedDetails.growthTime || 60;
          let mutationChance = 0.1;

          if (weatherData.currentWeather.toLowerCase().includes('rain')) {
            growthTime *= 0.8;
            mutationChance += 0.1;
          }
          if (inventory.gear?.['Basic Sprinkler']) {
            growthTime *= 0.9;
            mutationChance += 0.05;
          }
          if (weatherData.currentWeather.toLowerCase().includes('thunderstorm') && inventory.gear?.['Lightning Rod']) {
            mutationChance += 0.15;
          }
          if (pets.active.some((pet) => pet.name === 'Praying Mantis' && pet.hunger >= 20)) {
            mutationChance += 0.2;
          }
          if (pets.active.some((pet) => pet.name === 'Green Lab' && pet.hunger >= 20 && Math.random() < 0.05)) {
            const seedKeys = Object.keys(itemData.seeds);
            const randomSeed = seedKeys[Math.floor(Math.random() * seedKeys.length)];
            inventory.seeds[randomSeed] = (inventory.seeds[randomSeed] || 0) + 1;
          }

          inventory.seeds[canonicalName] -= 1;
          if (inventory.seeds[canonicalName] === 0) {
            delete inventory.seeds[canonicalName];
          }

          crops.push({
            type: 'crop',
            seedName: canonicalName,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000,
            regrows: seedDetails.regrows || false,
            mutations: mutationChance > Math.random() ? ['Glow'] : [],
          });

          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(
            format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Planted ${canonicalName}! It will take ${Math.round(growthTime)} seconds to grow. Check progress with: #garden check${mutationChance > Math.random() ? '\nPossible Glow mutation!' : ''}`,
            })
          );
        }

        case 'hatch': {
          if (!args[1]) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Specify a pet egg to hatch! Use: #garden hatch <petEgg>',
              })
            );
          }
          const eggName = args.slice(1).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
          const eggDetails = getItemDetails('petEggs', eggName);

          if (!eggDetails.canonicalName || !itemData.petEggs[eggDetails.canonicalName]) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Pet egg '${eggName}' not found! Check available pet eggs with: #garden stock`,
              })
            );
          }

          const { canonicalName, hatchTime } = eggDetails;
          if (!inventory.petEggs?.[canonicalName] || inventory.petEggs[canonicalName] <= 0) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You don't have ${canonicalName} pet eggs! Buy more with: #garden buy petEgg ${canonicalName}`,
              })
            );
          }

          if (crops.length >= 10) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Your garden is full! Harvest crops first to make space with: #garden harvest',
              })
            );
          }

          let adjustedHatchTime = hatchTime || 1800;
          if (pets.active.some((pet) => pet.name === 'Polar Bear' && pet.hunger >= 20)) {
            adjustedHatchTime *= 0.8;
          }

          inventory.petEggs[canonicalName] -= 1;
          if (inventory.petEggs[canonicalName] === 0) {
            delete inventory.petEggs[canonicalName];
          }

          crops.push({
            type: 'petEgg',
            eggName: canonicalName,
            plantedAt: Date.now(),
            hatchTime: adjustedHatchTime * 1000,
          });

          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(
            format({
              title: 'Hatch 🥚',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Placed ${canonicalName} to hatch! It will take ${Math.round(adjustedHatchTime)} seconds. Check progress with: #garden check`,
            })
          );
        }

        case 'check': {
          if (!crops.length) {
            return chat.reply(
              format({
                title: 'Check 🌱🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Your garden is empty! Plant seeds with: #garden plant, or hatch pet eggs with: #garden hatch',
              })
            );
          }

          const now = Date.now();
          const status = crops.map((item, index) => {
            if (item.type === 'petEgg') {
              const timeLeft = Math.max(0, Math.round((item.plantedAt + item.hatchTime - now) / 1000));
              return `${index + 1}. ${item.eggName} (Pet Egg) - ${timeLeft}s left to hatch`;
            } else {
              const timeLeft = Math.max(0, Math.round((item.plantedAt + item.growthTime - now) / 1000));
              return `${index + 1}. ${item.seedName} (Crop) - ${timeLeft}s left to grow${item.mutations.length ? ', Mutations: ' + item.mutations.join(', ') : ''}`;
            }
          });

          return chat.reply(
            format({
              title: 'Garden Status 🌱🥚',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Your garden (${crops.length}/10):\n${status.join('\n')}\n\nUse #garden harvest Nigerians when items are ready!`,
            })
          );
        }

        case 'inventory': {
          const seedList = Object.entries(inventory.seeds || {})
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No seeds';
          const gearList = Object.entries(inventory.gear || {})
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No gear';
          const eggList = Object.entries(inventory.eggs || {})
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No hatching eggs';
          const cosmeticList = Object.entries(inventory.cosmetics || {})
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No cosmetics';
          const petEggList = Object.entries(inventory.petEggs || {})
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No pet eggs';
          const activePetList = pets.active
            .map((pet, index) => `${index + 1}. ${pet.name} (Hunger: ${pet.hunger.toFixed(1)}/100, Passive: ${pet.hunger >= 20 ? pet.passive : 'Disabled (low hunger)'})`)
            .join('\n') || 'No active pets';
          const storedPetList = pets.stored
            .map((pet, index) => `${index + 1}. ${pet.name} (Hunger: ${pet.hunger.toFixed(1)}/100, Passive: ${pet.hunger >= 20 ? pet.passive : 'Disabled (low hunger)'})`)
            .join('\n') || 'No stored pets';

          return chat.reply(
            format({
              title: 'Inventory 🎒',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content:
                `**Balance**: $${balance.toLocaleString()}\n` +
                `**Pet Slots**: ${petSlots}\n\n` +
                `**Seeds**:\n${seedList}\n\n` +
                `**Gear**:\n${gearList}\n\n` +
                `**Hatching Eggs**:\n${eggList}\n\n` +
                `**Cosmetics**:\n${cosmeticList}\n\n` +
                `**Pet Eggs**:\n${petEggList}\n\n` +
                `**Active Pets**:\n${activePetList}\n\n` +
                `**Stored Pets**:\n${storedPetList}`,
            })
          );
        }

        case 'harvest': {
          if (!crops.length) {
            return chat.reply(
              format({
                title: 'Harvest 🌾',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'No crops or pet eggs ready to harvest! Check growth status with: #garden check',
              })
            );
          }

          let harvested = [];
          let totalYield = 0;
          const now = Date.now();

          crops = crops.filter((item) => {
            if (item.type === 'petEgg') {
              if (now >= item.plantedAt + item.hatchTime) {
                const newPet = hatchPet(item.eggName);
                if (newPet) {
                  if (pets.active.length < petSlots) {
                    pets.active.push(newPet);
                    harvested.push(`${newPet.name} hatched from ${item.eggName}!`);
                  } else {
                    pets.stored.push(newPet);
                    harvested.push(`${newPet.name} hatched from ${item.eggName} and stored!`);
                  }
                }
                return false;
              }
              return true;
            } else {
              if (now >= item.plantedAt + item.growthTime) {
                let yieldValue = itemData.seeds[item.seedName]?.baseYield || 100;
                if (item.mutations.includes('Glow') && pets.active.some((pet) => pet.name === 'Dragonfly' && pet.hunger >= 20)) {
                  yieldValue *= 20;
                }
                if (pets.active.some((pet) => pet.name === 'Polar Bear' && pet.hunger >= 20) && Math.random() < 0.1) {
                  yieldValue *= Math.random() < 0.5 ? 2 : 10;
                }
                if (pets.active.some((pet) => pet.name === 'Red Giant Ant' && pet.hunger >= 20) && Math.random() < 0.05) {
                  harvested.push(`${item.seedName} ($${yieldValue}, duplicated by Red Giant Ant)`);
                  totalYield += yieldValue;
                }
                if (pets.active.some((pet) => pet.name === 'Bunny' && pet.hunger >= 20) && item.seedName === 'Carrot') {
                  yieldValue *= 1.5;
                }
                harvested.push(`${item.seedName} ($${yieldValue}${item.mutations.length ? ', ' + item.mutations.join(', ') : ''})`);
                totalYield += yieldValue;
                inventory.seeds[item.seedName] = (inventory.seeds[item.seedName] || 0) + 1;
                if (item.regrows) {
                  item.plantedAt = now;
                  return true;
                }
                return false;
              }
              return true;
            }
          });

          if (pets.active.some((pet) => pet.name === 'Raccoon' && pet.hunger >= 20) && Math.random() < 0.1) {
            const rareSeeds = ['CandyBlossom', 'MoonMango'];
            const stolenSeed = rareSeeds[Math.floor(Math.random() * rareSeeds.length)];
            inventory.seeds[stolenSeed] = (inventory.seeds[stolenSeed] || 0) + 1;
            harvested.push(`Raccoon stole a ${stolenSeed} seed!`);
          }

          balance += totalYield;
          await Currencies.setData(senderID, { crops, balance, pets, inventory });

          return chat.reply(
            format({
              title: 'Harvest 🌾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: harvested.length
                ? `Harvested:\n${harvested.join('\n')}\n\nEarned: $${totalYield}\nNew balance: $${balance.toLocaleString()}\n\nCrops added to inventory. Check remaining crops with: #garden check`
                : 'No crops or pet eggs are ready yet! Check growth status with: #garden check',
            })
          );
        }

        case 'pets': {
          if (args[1]?.toLowerCase() === 'swap') {
            const petIndex = parseInt(args[2]) - 1;
            const storedIndex = parseInt(args[3]) - 1;
            if (isNaN(petIndex) || isNaN(storedIndex) || petIndex < 0 || petIndex >= pets.active.length || storedIndex < 0 || storedIndex >= pets.stored.length) {
              return chat.reply(
                format({
                  title: 'Pets 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: 'Usage: #garden pets swap <active pet index> <stored pet index> (check indices with #garden inventory)',
                })
              );
            }
            [pets.active[petIndex], pets.stored[storedIndex]] = [pets.stored[storedIndex], pets.active[petIndex]];
            pets.active[petIndex].lastUpdated = Date.now();
            pets.stored[storedIndex].lastUpdated = Date.now();
            await Currencies.setData(senderID, { pets });
            return chat.reply(
              format({
                title: 'Pets 🐾',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Swapped ${pets.active[petIndex].name} with ${pets.stored[storedIndex].name}!`,
              })
            );
          } else if (args[1]?.toLowerCase() === 'feed') {
            if (!args[2] || !args[3]) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: 'Usage: #garden pets feed <active/stored> <pet index> <crop> (e.g., #garden pets feed active 1 Carrot)',
                })
              );
            }
            const petType = args[2].toLowerCase();
            const petIndex = parseInt(args[3]) - 1;
            const cropName = args.slice(4).join(' ').trim().toLowerCase();
            const cropDetails = getItemDetails('seeds', cropName);
            const { canonicalName: cropCanonicalName, foodValue } = cropDetails;

            if (!['active', 'stored'].includes(petType)) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: 'Invalid pet type! Use: active or stored',
                })
              );
            }
            const petList = petType === 'active' ? pets.active : pets.stored;
            if (isNaN(petIndex) || petIndex < 0 || petIndex >= petList.length) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `Invalid pet index! Check indices with: #garden inventory`,
                })
              );
            }
            if (!cropDetails.canonicalName || !itemData.seeds[cropCanonicalName]) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `Crop '${cropName}' not found! Check your inventory with: #garden inventory`,
                })
              );
            }
            if (!inventory.seeds?.[cropCanonicalName] || inventory.seeds[cropCanonicalName] <= 0) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `You don't have ${cropCanonicalName} in your inventory! Plant and harvest more crops with: #garden plant`,
                })
              );
            }

            const pet = petList[petIndex];
            if (!petData[pet.name]) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `Invalid pet '${pet.name}'! Please contact support.`,
                })
              );
            }
            if (pet.hunger >= 100) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `${pet.name} is already full (Hunger: ${pet.hunger.toFixed(1)}/100)!`,
                })
              );
            }
            if (petData[pet.name].preferredFood && petData[pet.name].preferredFood !== cropCanonicalName) {
              return chat.reply(
                format({
                  title: 'Feed 🐾',
                  titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                  content: `${pet.name} only eats ${petData[pet.name].preferredFood}! Try a different crop.`,
                })
              );
            }

            inventory.seeds[cropCanonicalName] -= 1;
            if (inventory.seeds[cropCanonicalName] === 0) {
              delete inventory.seeds[cropCanonicalName];
            }
            pet.hunger = Math.min(100, pet.hunger + (foodValue || 20));
            pet.lastUpdated = Date.now();

            await Currencies.setData(senderID, { inventory, pets });
            return chat.reply(
              format({
                title: 'Feed 🐾',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Fed ${pet.name} with ${cropCanonicalName}! Hunger restored to ${pet.hunger.toFixed(1)}/100.${pet.hunger >= 20 ? ' Passive ability activated!' : ' Feed more to restore passive ability.'}`,
              })
            );
          }
          return chat.reply(
            format({
              title: 'Pets 🐾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Available commands:\n#garden pets swap <active pet index> <stored pet index>\n#garden pets feed <active/stored> <pet index> <crop>`,
            })
          );
        }

        default:
          return chat.reply(
            format({
              title: 'Garden 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Available commands: register, stock, weather, buy, plant, hatch, check, inventory, harvest, pets`,
            })
          );
      }
    } catch (error) {
      console.error('Garden command error:', error);
      return chat.reply(
        format({
          title: 'Error ❌',
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          content: error.stack || error.message || 'An error occurred. Please try again later.',
        })
      );
    }
  },
};