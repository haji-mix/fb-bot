const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../../hajime.json");

module.exports.config = {
    name: "help",
    version: "1.3.1",
    role: 0,
    isPrefix: false,
    type: "bot-utility",
    aliases: ["info", "menu"],
    info: "Displays a categorized guide of available commands",
    usage: "[page-number/commandname/all]",
    credits: "Developer"
};

module.exports.run = async ({ api, event, Utils, prefix, args, chat, font, admin }) => {
    if (!fs.existsSync(configPath)) {
        return api.sendMessage("Configuration file not found!", event.threadID, event.messageID);
    }

    const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
    const input = args.join(" ").trim()?.toLowerCase();
    const isAdmin = admin.includes(String(event.senderID));
    const allCommands = [...Utils.commands.values()].filter(cmd => isAdmin || cmd.type !== "nsfw");
    const perPage = 50;
    const totalCommands = allCommands.length;
    const commandPrefix = prefix || "";

    const categorizedCommands = allCommands.reduce((acc, cmd) => {
        const type = cmd.type || "Uncategorized";
        acc[type] = acc[type] || [];
        acc[type].push(cmd);
        return acc;
    }, {});

    const sortedCategories = Object.keys(categorizedCommands).sort();

    if (!input || input === "all") {
        let helpMessage = `${font.bold(`📚 | COMMAND LIST: [${prefix || "NO PREFIX"}]\n`)}`;
        helpMessage += `${font.bold(`TOTAL: ${totalCommands}\n\n`)}`;

        let commandCount = 0;
        for (const category of sortedCategories) {
            const commands = categorizedCommands[category];
            if (commandCount + commands.length > perPage) break;
            helpMessage += `${font.bold(`[${category.toUpperCase()}]`)}\n`;
            commands.forEach((cmd, i) => {
                if (commandCount < perPage) {
                    const displayName = cmd.isPrefix ? commandPrefix + cmd.name : cmd.name;
                    helpMessage += `\t${commandCount + 1}. ${font.bold(displayName)} ${cmd.usage || ""}\n`;
                    commandCount++;
                }
            });
            helpMessage += "\n";
        }

        helpMessage += `\n• Use 'HELP [page-number]' for more pages\n`;
        helpMessage += `• Use 'HELP [cmd name]' for details\n\n`;

        const ireply = await chat.reply(font.thin(helpMessage));
        ireply.unsend(150000);
    } else if (!isNaN(input)) {
        const page = parseInt(input);
        const totalPages = Math.ceil(totalCommands / perPage);

        if (page < 1 || page > totalPages) {
            const ireply = await chat.reply(`Invalid page. Use 1 to ${totalPages}.`);
            ireply.unsend(5000);
            return;
        }

        const start = (page - 1) * perPage;
        const end = Math.min(start + perPage, totalCommands);

        const flatCommands = sortedCategories.flatMap(category => categorizedCommands[category]);
        const commandsOnPage = flatCommands.slice(start, end);

        let helpMessage = `${font.bold(`📚 | COMMAND LIST ${page}/${totalPages}\n`)}`;
        helpMessage += `${font.bold(`TOTAL: ${totalCommands}\n\n`)}`;

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
                commandsInRange.forEach((cmd) => {
                    const displayName = cmd.isPrefix ? commandPrefix + cmd.name : cmd.name;
                    helpMessage += `\t${commandCount + 1}. ${font.bold(displayName)} ${cmd.usage || ""}\n`;
                    commandCount++;
                });
                helpMessage += "\n";
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
            const roleText = {
                0: "User",
                1: "Bot-admin owner",
                2: "Group admins",
                3: "Super admins/moderators"
            }[role] || "User";
            const messages = [
                `COMMAND DETAILS\n\n`,
                name ? `NAME: ${font.bold(name)}\n` : "",
                version ? `VERSION: ${version}\n` : "",
                type ? `CATEGORY: ${type}\n` : "CATEGORY: Uncategorized\n",
                role !== undefined ? `ROLE: ${roleText}\n` : "",
                aliases.length ? `ALIASES: ${aliases.join(", ")}\n` : "",
                `PREFIX: ${isPrefix && prefix ? `Required (${prefix})` : "Not Required"}\n`,
                info ? `INFO: ${info}\n` : "",
                usage ? `USAGE: ${usage}\n` : "",
                guide ? `GUIDE: ${guide}\n` : "",
                credits ? `CREDITS: ${credits}\n` : "",
                cd ? `COOLDOWN: ${cd} second(s)\n` : ""
            ].filter(Boolean);

            const ireply = await chat.reply(font.thin(messages.join("")));
            ireply.unsend(40000);
        } else {
            const ireply = await chat.reply(`Command '${input}' not found. Use 'HELP' for list.`);
            ireply.unsend(10000);
        }
    }
};

module.exports.handleEvent = async ({ event, prefix, chat, font }) => {
    const { body } = event;
    try {
        const message = prefix ? `PREFIX > ["${prefix}"]` : `CHATBOX AI SYSTEM > ["NO PREFIX"]`;
        if (["prefix", "system"].includes(body?.toLowerCase())) {
            const randomPrompts = [
                "lumine genshin impact",
                "klee genshin impact",
                "paimon shogun genshin impact",
                "nahida shogun genshin impact",
                "anime girl in cherry blossom garden",
                "tsundere girl",
                "yandere girl",
                "highschool girl",
                "cute anime cat girl",
                "magical girl transformation sequence",
                "kawaii Chibi characters"
            ];

            const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];

            chat.reply({
                body: font.thin(message),
                attachment: await chat.stream(
                    global.api.hajime + "/api/crushimg?" + new URLSearchParams({
                        prompt: randomPrompt,
                        style: "anime",
                        negative_prompt: "hentai, nsfw, nude, naked, sexual, porn, blurry, low, quality, distorted, sketch drawing, pencil drawing"
                    })
                )
            });
        }
    } catch (error) {
        console.error(error.stack || error.message);
    }
};