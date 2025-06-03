module.exports = {
  config: {
    name: 'garden',
    aliases: ['gag'],
    type: 'game',
    author: 'xAI',
    role: 0,
    cooldowns: 5,
    description: 'Manage your Grow A Garden farm: plant seeds, buy gear, eggs, cosmetics, hatch pets, and sell crops',
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

      // Load user data
      let userData = (await Currencies.getData(senderID)) || {};
      let balance = userData.balance || 0;
      let inventory = userData.inventory || { seeds: {}, gear: {}, eggs: {}, cosmetics: {}, petEggs: {} };
      let playerName = userData.name || null;
      let crops = userData.crops || [];
      let pets = userData.pets || { active: [], stored: [] }; // Active pets (max 3), stored pets
      let petSlots = userData.petSlots || 3; // Default 3 pet slots

      // Static item data
      const itemData = {
        seeds: {
          Carrot: { price: 50, growthTime: 60, baseYield: 100, regrows: false },
          Corn: { price: 60, growthTime: 120, baseYield: 150, regrows: false },
          Daffodil: { price: 70, growthTime: 90, baseYield: 120, regrows: false },
          Strawberry: { price: 80, growthTime: 180, baseYield: 200, regrows: true },
          Tomato: { price: 60, growthTime: 120, baseYield: 140, regrows: true },
          Blueberry: { price: 90, growthTime: 240, baseYield: 250, regrows: true },
          CandyBlossom: { price: 500, growthTime: 300, baseYield: 1000, regrows: false },
          MoonMango: { price: 600, growthTime: 360, baseYield: 1200, regrows: false },
        },
        gear: {
          'Favorite Tool': { price: 100, effect: 'Increases mutation chance' },
          Trowel: { price: 50, effect: 'Speeds up planting' },
          'Basic Sprinkler': { price: 20000, effect: 'Increases crop size' },
          'Watering Can': { price: 150, effect: 'Reduces growth time' },
          'Lightning Rod': { price: 500, effect: 'Boosts thunderstorm mutations' },
          'Recall Wrench': { price: 300, effect: 'Recalls pets' },
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

      // Static pet data based on Game Rant tier list and other sources
      const petData = {
        Dragonfly: { rarity: 'Bug', passive: 'Turns a random fruit into Gold (20x value) every 5 minutes', hatchChance: 0.01, egg: 'Bug Egg' },
        'Praying Mantis': { rarity: 'Bug', passive: 'Prays every 80s for a crop mutation (e.g., Gold, Shocked)', hatchChance: 0.05, egg: 'Bug Egg' },
        Raccoon: { rarity: 'Legendary', passive: 'Duplicates a random fruit from a neighbor’s garden every 15 minutes', hatchChance: 0.03, egg: 'Legendary Egg' },
        'Polar Bear': { rarity: 'Rare', passive: 'Chance to apply Chilled (2x value) or Frozen (10x value) mutation', hatchChance: 0.1, egg: 'Rare Egg' },
        'Red Giant Ant': { rarity: 'Mythical', passive: '5% chance to duplicate crops on harvest', hatchChance: 0.02, egg: 'Mythical Egg' },
        Pig: { rarity: 'Uncommon', passive: 'Grants mutations to nearby crops', hatchChance: 0.2, egg: 'Uncommon Egg' },
        'Golden Lab': { rarity: 'Common', passive: '5% chance to dig up a random seed every 60s', hatchChance: 0.333, egg: 'Common Egg' },
        Mole: { rarity: 'Legendary', passive: 'Digs up free gear or Sheckles', hatchChance: 0.03, egg: 'Legendary Egg' },
        'Brown Mouse': { rarity: 'Common', passive: 'Grants 750 XP/10 min and boosts jump height', hatchChance: 0.3, egg: 'Common Egg' },
        'Red Fox': { rarity: 'Mythical', passive: 'Steals a seed from a neighbor’s garden every 10 minutes', hatchChance: 0.01, egg: 'Mythical Egg' },
        'Blood Owl': { rarity: 'Mythical', passive: 'Active pets gain 0.5 XP/s', hatchChance: 0.02, egg: 'Mythical Egg' },
        'Chicken Zombie': { rarity: 'Mythical', passive: '20% chance every 30 min for Zombified mutation (25x value)', hatchChance: 0, egg: 'Event' },
        Firefly: { rarity: 'Mythical', passive: '3.07% chance every 79s to turn a crop Shocked (50x value)', hatchChance: 0, egg: 'Event' },
        'Moon Cat': { rarity: 'Legendary', passive: 'Boosts fruit size (1.51x) and preserves event plants', hatchChance: 0.01, egg: 'Legendary Egg' },
        // Additional pets for variety
        Caterpillar: { rarity: 'Common', passive: 'Leafy plants grow faster', hatchChance: 0.3, egg: 'Common Egg' },
        'Silver Monkey': { rarity: 'Legendary', passive: 'Chance to refund sold fruit', hatchChance: 0.05, egg: 'Legendary Egg' },
        'Echo Frog': { rarity: 'Rare', passive: 'Speeds up a random plant’s growth by 1 day every 10 min', hatchChance: 0.1, egg: 'Rare Egg' },
        'Orange Tabby': { rarity: 'Uncommon', passive: 'Boosts crop size by 1.5x when napping', hatchChance: 0.2, egg: 'Uncommon Egg' },
      };

      // Static stock data
      const stockData = {
        seeds: ['Carrot **x10**', 'Corn **x8**', 'Daffodil **x5**', 'Strawberry **x3**', 'Tomato **x6**', 'Blueberry **x2**', 'CandyBlossom **x1**', 'MoonMango **x1**'],
        gear: ['Favorite Tool **x5**', 'Trowel **x10**', 'Basic Sprinkler **x1**', 'Watering Can **x3**'],
        eggs: ['Common Egg **x5**', 'Uncommon Egg **x2**'],
        cosmetics: ['Common Gnome Crate **x10**', 'Ring Walkway **x5**', 'Large Wood Table **x3**', 'Torch **x8**'],
        petEggs: ['Common Egg **x5**', 'Uncommon Egg **x3**', 'Rare Egg **x2**', 'Legendary Egg **x1**', 'Bug Egg **x1**', 'Mythical Egg **x1**'],
        bloodTwilight: { blood: {}, twilight: {} },
        updatedAt: Date.now(),
      };

      // Static weather data (rotates every 5 minutes)
      const weatherOptions = [
        { currentWeather: 'Clear', icon: '☀️', description: 'Sunny and calm', effectDescription: 'None', cropBonuses: 'None', mutations: [], rarity: 'Common' },
        { currentWeather: 'Rain', icon: '🌧️', description: 'Wet and rainy', effectDescription: 'Reduces growth time by 20%', cropBonuses: 'All crops', mutations: ['Glow'], rarity: 'Uncommon' },
        { currentWeather: 'Thunderstorm', icon: '⛈️', description: 'Stormy with lightning', effectDescription: 'Increases mutation chance', cropBonuses: 'None', mutations: ['Electric'], rarity: 'Rare' },
      ];
      const weatherCycleDuration = 5 * 60 * 1000; // 5 minutes
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
        const canonicalName = itemMaps[itemType]?.[itemName.toLowerCase()] || itemName;
        return { canonicalName, ...itemData[itemType]?.[canonicalName] };
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
        const eggDetails = itemData.petEggs[eggName];
        if (!eggDetails) return null;
        const possiblePets = Object.keys(petData).filter((pet) => petData[pet].egg === eggName);
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
            };
          }
        }
        return null;
      };

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
                content: `You are already registered as ${playerName}!`,
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
            balance: 1000,
            inventory: { seeds: {}, gear: {}, eggs: {}, cosmetics: {}, petEggs: {} },
            crops: [],
            pets: { active: [], stored: [] },
            petSlots: 3,
          });
          return chat.reply(
            format({
              title: 'Register ✅',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Welcome, ${name}! You've started your garden with $1000 and 3 pet slots.`,
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
                content: 'Usage: buy <type> <item> [quantity] (e.g., #garden buy seed Carrot **x2**, #garden buy petEgg Bug Egg **x1**)',
              })
            );
          }
          const itemType = args[1].toLowerCase();
          const itemName = args.slice(2).join(' ').replace(/\*\*x\d+\*\*/g, '').trim().toLowerCase();
          const quantityMatch = args.join(' ').match(/\*\*x(\d+)\*\*/);
          const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;

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

          const itemDetails = getItemDetails(itemType, itemName);
          const { canonicalName, price } = itemDetails;

          if (!itemData[itemType][canonicalName]) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Item '${itemName}' not found! Check stock with: #garden stock`,
              })
            );
          }

          const stockItems = stockData[itemType];
          if (!findItemInStock(stockItems, canonicalName, quantity)) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `${canonicalName} x${quantity} is not in stock! Check: #garden stock`,
              })
            );
          }

          const totalCost = price * quantity;
          if (balance < totalCost) {
            return chat.reply(
              format({
                title: 'Buy 🛒',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You need $${totalCost} to buy ${canonicalName} x${quantity}! You have $${balance}.`,
              })
            );
          }

          inventory[itemType][canonicalName] = (inventory[itemType][canonicalName] || 0) + quantity;
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
          if (!inventory.seeds[canonicalName] || inventory.seeds[canonicalName] <= 0) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You don't have ${canonicalName} seeds! Check your inventory with: #garden inventory`,
              })
            );
          }

          if (crops.length >= 10) {
            return chat.reply(
              format({
                title: 'Plant 🌱',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Your garden is full! Harvest or sell crops first with: #garden harvest',
              })
            );
          }

          let growthTime = seedDetails.growthTime;
          let mutationChance = 0.1;

          if (weatherData.currentWeather.toLowerCase().includes('rain')) {
            growthTime *= 0.8;
            mutationChance += 0.1;
          }
          if (inventory.gear['Basic Sprinkler']) {
            growthTime *= 0.9;
            mutationChance += 0.05;
          }
          if (weatherData.currentWeather.toLowerCase().includes('thunderstorm') && inventory.gear['Lightning Rod']) {
            mutationChance += 0.15;
          }
          if (pets.active.some((pet) => pet.name === 'Praying Mantis')) {
            mutationChance += 0.2;
          }
          if (pets.active.some((pet) => pet.name === 'Echo Frog')) {
            growthTime *= 0.9;
          }

          inventory.seeds[canonicalName] -= 1;
          if (inventory.seeds[canonicalName] === 0) {
            delete inventory.seeds[canonicalName];
          }

          crops.push({
            seedName: canonicalName,
            plantedAt: Date.now(),
            growthTime: growthTime * 1000,
            regrows: seedDetails.regrows || false,
            mutations: mutationChance > Math.random() ? ['Gold'] : [], // Simplified mutation logic
          });

          await Currencies.setData(senderID, { inventory, crops });
          return chat.reply(
            format({
              title: 'Plant 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Planted ${canonicalName}! Growth time: ${Math.round(growthTime)} seconds.${mutationChance > Math.random() ? ' Possible Gold mutation!' : ''}`,
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
          if (!inventory.petEggs[canonicalName] || inventory.petEggs[canonicalName] <= 0) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `You don't have ${canonicalName} pet eggs! Check your inventory with: #garden inventory`,
              })
            );
          }

          if (crops.length >= 10) {
            return chat.reply(
              format({
                title: 'Hatch 🥚',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: 'Your garden is full! Harvest or sell crops first to make space for hatching.',
              })
            );
          }

          inventory.petEggs[canonicalName] -= 1;
          if (inventory.petEggs[canonicalName] === 0) {
            delete inventory.petEggs[canonicalName];
          }

          let adjustedHatchTime = hatchTime;
          if (pets.active.some((pet) => pet.name === 'Chicken Zombie' || pet.name === 'Blood Kiwi')) {
            adjustedHatchTime *= 0.8; // 20% faster hatching
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
              content: `Placed ${canonicalName} to hatch! Hatch time: ${Math.round(adjustedHatchTime)} seconds.`,
            })
          );
        }

        case 'inventory': {
          const seedList = Object.entries(inventory.seeds)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No seeds';
          const gearList = Object.entries(inventory.gear)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No gear';
          const eggList = Object.entries(inventory.eggs)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No hatching eggs';
          const cosmeticList = Object.entries(inventory.cosmetics)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No cosmetics';
          const petEggList = Object.entries(inventory.petEggs)
            .map(([name, qty]) => `${name}: ${qty}`)
            .join('\n') || 'No pet eggs';
          const activePetList = pets.active
            .map((pet) => `${pet.name} (Age: ${pet.age}, Hunger: ${pet.hunger}, Passive: ${pet.passive})`)
            .join('\n') || 'No active pets';
          const storedPetList = pets.stored
            .map((pet) => `${pet.name} (Age: ${pet.age}, Hunger: ${pet.hunger}, Passive: ${pet.passive})`)
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
                content: 'No crops or pet eggs to harvest!',
              })
            );
          }

          let harvested = [];
          let totalYield = 0;
          const now = Date.now();
          let newPets = [];

          crops = crops.filter((crop) => {
            if (crop.type === 'petEgg') {
              if (now >= crop.plantedAt + crop.hatchTime) {
                const newPet = hatchPet(crop.eggName);
                if (newPet) {
                  if (pets.active.length < petSlots) {
                    pets.active.push(newPet);
                    harvested.push(`${newPet.name} hatched from ${crop.eggName}!`);
                  } else {
                    pets.stored.push(newPet);
                    harvested.push(`${newPet.name} hatched from ${crop.eggName} and stored!`);
                  }
                }
                return false;
              }
              return true;
            } else {
              if (now >= crop.plantedAt + crop.growthTime) {
                let yieldValue = itemData.seeds[crop.seedName]?.baseYield || 100;
                if (crop.mutations.includes('Gold') && pets.active.some((pet) => pet.name === 'Dragonfly')) {
                  yieldValue *= 20; // Gold mutation from Dragonfly
                }
                if (pets.active.some((pet) => pet.name === 'Polar Bear') && Math.random() < 0.1) {
                  yieldValue *= Math.random() < 0.5 ? 2 : 10; // Chilled or Frozen
                }
                if (pets.active.some((pet) => pet.name === 'Chicken Zombie') && Math.random() < 0.2) {
                  yieldValue *= 25; // Zombified mutation
                }
                if (pets.active.some((pet) => pet.name === 'Red Giant Ant') && Math.random() < 0.05) {
                  harvested.push(`${crop.seedName} ($${yieldValue}, duplicated by Red Giant Ant)`);
                  totalYield += yieldValue; // Duplicate crop
                }
                harvested.push(`${crop.seedName} ($${yieldValue}${crop.mutations.length ? ', ' + crop.mutations.join(', ') : ''})`);
                totalYield += yieldValue;
                if (crop.regrows) {
                  crop.plantedAt = now; // Reset growth timer for regrowing crops
                  return true;
                }
                return false;
              }
              return true;
            }
          });

          if (pets.active.some((pet) => pet.name === 'Raccoon') && Math.random() < 0.1) {
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
              content: `Harvested:\n${harvested.join('\n')}\n\nEarned: $${totalYield}\nNew balance: $${balance.toLocaleString()}`,
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
            await Currencies.setData(senderID, { pets });
            return chat.reply(
              format({
                title: 'Pets 🐾',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Swapped ${pets.active[petIndex].name} with ${pets.stored[storedIndex].name}!`,
              })
            );
          }
          return chat.reply(
            format({
              title: 'Pets 🐾',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Available commands: #garden pets swap <active pet index> <stored pet index>`,
            })
          );
        }

        default:
          return chat.reply(
            format({
              title: 'Garden 🌱',
              titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
              content: `Available commands: register, stock, weather, buy, plant, hatch, inventory, harvest, pets`,
            })
          );
      }
    } catch (error) {
      console.error('Garden command error:', error);
      return chat.reply(
        format({
          title: 'Error ❌',
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          content: 'An error occurred. Please try again later.',
        })
      );
    }
  },
};