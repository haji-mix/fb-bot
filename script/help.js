const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, '../hajime.json');

module.exports.config = {
    name: 'help',
    version: '1.3.0',
    role: 0,
    isPrefix: false,
    type: "guide",
    aliases: ['info', 'menu'],
    info: "Displays a categorized guide of available commands",
    usage: "[page-number/commandname/all]",
    credits: 'Developer'
};

module.exports.run = async ({ api, event, Utils, prefix, args, chat, font }) => {
    if (!fs.existsSync(configPath)) {
        return api.sendMessage('Configuration file not found!', event.threadID, event.messageID);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const input = args.join(' ').trim()?.toLowerCase();
    const allCommands = [...Utils.commands.values()];
    const perPage = 50;
    const totalCommands = allCommands.length;
    const commandPrefix = prefix || ''; // Use empty string if no prefix

    // Group commands by type
    const categorizedCommands = allCommands.reduce((acc, cmd) => {
        const type = cmd.type || 'Uncategorized';
        if (!acc[type]) acc[type] = [];
        acc[type].push(cmd);
        return acc;
    }, {});

    // Sort categories alphabetically
    const sortedCategories = Object.keys(categorizedCommands).sort();

    if (!input || input === 'all') {
        let helpMessage = `${font.bold(`📚 | COMMAND LIST: [${prefix || 'NO PREFIX'}]\n`)}`;
        helpMessage += `${font.bold(`TOTAL: ${totalCommands}\n\n`)}`;

        // Display first page of categorized commands
        let commandCount = 0;
        for (const category of sortedCategories) {
            const commands = categorizedCommands[category];
            if (commandCount + commands.length > perPage) break; // Stop if exceeding perPage
            helpMessage += `${font.bold(`[${category.toUpperCase()}]`)}\n`;
            commands.forEach((cmd, i) => {
                if (commandCount < perPage) {
                    const displayName = cmd.isPrefix ? commandPrefix + cmd.name : cmd.name;
                    helpMessage += `\t${commandCount + 1}. ${font.bold(displayName)} ${cmd.usage || ''}\n`;
                    commandCount++;
                }
            });
            helpMessage += '\n';
        }

        helpMessage += `\n• Use 'HELP [page-number]' for more pages\n`;
        helpMessage += `• Use 'HELP [cmd name]' for details\n\n`;

        const ireply = await chat.reply(font.thin(helpMessage));
        ireply.unsend(150000);
    } else if (!isNaN(input)) {
        const page = parseInt(input);
        const totalPages = Math.ceil(totalCommands / perPage);

        if (page < 1 || page > totalPages) {
            let ireply = await chat.reply(`Invalid page. Use 1 to ${totalPages}.`);
            ireply.unsend(5000);
            return;
        }

        const start = (page - 1) * perPage;
        const end = Math.min(start + perPage, totalCommands);

        // Flatten commands for pagination
        const flatCommands = sortedCategories.flatMap(category => categorizedCommands[category]);
        const commandsOnPage = flatCommands.slice(start, end);

        let helpMessage = `${font.bold(`📚 | COMMAND LIST ${page}/${totalPages}\n`)}`;
        helpMessage += `${font.bold(`TOTAL: ${totalCommands}\n\n`)}`;

        // Rebuild categorized display for the page
        let commandCount = start;
        let currentIndex = 0;
        for (const category of sortedCategories) {
            const commands = categorizedCommands[category];
            const commandsInRange = commands.filter((_, i) => {
                const globalIndex = currentIndex + i;
                return globalIndex >= start && globalIndex < end;
            });
            currentIndex += commands.length;

            if (commandsInRange.length > 0) {
                helpMessage += `${font.bold(`[${category.toUpperCase()}]`)}\n`;
                commandsInRange.forEach((cmd, i) => {
                    const displayName = cmd.isPrefix ? commandPrefix + cmd.name : cmd.name;
                    helpMessage += `\t${commandCount + 1}. ${font.bold(displayName)} ${cmd.usage || ''}\n`;
                    commandCount++;
                });
                helpMessage += '\n';
            }
        }

        helpMessage += `\n• Use 'HELP [page-number]' for more pages\n`;
        helpMessage += `• Use 'HELP [cmd name]' for details\n`;

        const ireply = await chat.reply(font.thin(helpMessage) + `• Reply 'unfont' if fonts unsupported`);
        ireply.unsend(150000);
    } else {
        const cmd = allCommands.find(c => c.name?.toLowerCase() === input || c.aliases?.includes(input));
        
        if (cmd) {
            const { name, version, role, aliases = [], info, usage, isPrefix, guide, credits, cd, type } = cmd;
            const messages = [
                `COMMAND DETAILS\n\n`,
                name ? `NAME: ${font.bold(name)}\n` : '',
                version ? `VERSION: ${version}\n` : '',
                type ? `CATEGORY: ${type}\n` : 'CATEGORY: Uncategorized\n',
                role !== undefined ? `ROLE: ${role === 0 ? 'User' : role === 1 ? 'Bot-admin owner' : role === 2 ? 'Group admins' : 'Super admins/moderators'}\n` : '',
                aliases.length ? `ALIASES: ${aliases.join(', ')}\n` : '',
                `PREFIX: ${isPrefix && prefix ? `Required (${prefix})` : 'Not Required'}\n`,
                info ? `INFO: ${info}\n` : '',
                usage ? `USAGE: ${usage}\n` : '',
                guide ? `GUIDE: ${guide}\n` : '',
                credits ? `CREDITS: ${credits}\n` : '',
                cd ? `COOLDOWN: ${cd} second(s)\n` : ''
            ].filter(Boolean);

            const ireply = await chat.reply(font.thin(messages.join('')));
            ireply.unsend(40000);
        } else {
            let ireply = await chat.reply(`Command '${input}' not found. Use 'HELP' for list.`);
            ireply.unsend(10000);
        }
    }
};

module.exports.handleEvent = async ({ event, prefix, chat, font }) => {
    const { body } = event;
    try {
        const message = prefix ? `PREFIX > ["${prefix}"]` : `CHATBOX AI SYSTEM > ["NO PREFIX"]`;
        if (["prefix", "system"].includes(body?.toLowerCase())) {
            chat.reply({ body: font.thin(message), attachment: await chat.stream(global.api.hajime + "/api/crushimg?prompt=hutao+genshin+impact&style=anime&negative_prompt=") });
        }
    } catch (error) {
        console.error(error.stack || error.message);
    }
};