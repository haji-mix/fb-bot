const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, '../kokoro.json');

module.exports["config"] = {
    name: 'help',
    version: '1.0.0',
    role: 0,
    isPrefix: false,
    type: "guide",
    aliases: ['info',
        'menu'],
    info: "Beginner's guide",
    usage: "[page-number/commandname/all]",
    credits: 'Developer',
};

module.exports["run"] = async ({
    api, event, Utils, prefix, args, chat, font, global
}) => {

    if (!fs.existsSync(configPath)) {
        return api.sendMessage('Configuration file not found!', event.threadID, event.messageID);
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    const input = args.join(' ').trim()?.toLowerCase();
    const allCommands = [...Utils.commands.values()];
    const perPage = 50;
    const totalCommands = allCommands.length;

    if (!input) {
        let helpMessage = font.bold(`📚 | CMD LIST: 〔${prefix || 'NO PREFIX'}〕\n`);
        helpMessage += font.bold(`TOTAL COMMANDS: ${totalCommands}\n\n`);

        const firstPageCommands = allCommands.slice(0, perPage);
        firstPageCommands.forEach((command, index) => {
            const {
                name, info, usage
            } = command;
            helpMessage += `\t${index + 1}. ${font.bold(name)} ${usage ? `${usage}`: ''}\n`;
        });

        /*  helpMessage += `\n• To see all commands, use '${prefix || ''}HELP ALL'\n`;*/
        helpMessage += `\n• To see another page, use "HELP" [page-number]'\n`;
        helpMessage += `• For more information use "HELP" [cmd name]"\n\n`;
        helpMessage += `NOTE: NOT FOR SALE!\n- This bot is intended to be provided free of charge.`;
        helpMessage += `\nGCASH NO: 09468377615. If you'd like to support us and keep our server running 24/7, please consider donating.\n\n`;

        const ireply = await chat.reply(font.thin(helpMessage) + `• If Device Doesn't Support Fonts Reply this message with "unfont"`);
        ireply.unsend(150000);
        const url_array = [
            "https://files.catbox.moe/b5csz8.gif",
            "https://files.catbox.moe/3irbyb.gif",
            "https://files.catbox.moe/sh85xf.gif",
            "https://files.catbox.moe/0q7egf.gif",
            "https://files.catbox.moe/s7c7ka.gif",
            "https://files.catbox.moe/kfnbg5.gif",
            "https://files.catbox.moe/u9cd8m.gif",
            "https://files.catbox.moe/7qab3k.gif"
        ];
        const url = await chat.stream(url_array[Math.floor(Math.random() * url_array.length)]);
        if (url) {
            chat.reply({
                attachment: url
            });
        }
    } else /* if (input === 'all') {
    let helpMessage = font.bold(`📚 | CMD LIST 〔${prefix || 'NO PREFIX'}〕\n`);
    helpMessage += font.bold(`TOTAL COMMANDS: ${totalCommands}\n\n`);

    allCommands.forEach((command, index) => {
      const { name, info, usage } = command;
      helpMessage += `\t${index + 1}. ${font.bold(name)} ${usage ? `${usage}` : ''}\n`;
    });
    helpMessage += `\n• For more information use "HELP [cmd name]"`;

    const ireply = await chat.reply(helpMessage);
    ireply.unsend(150000);
  } else */ if (!isNaN(input)) {
        const page = parseInt(input);
        const totalPages = Math.ceil(totalCommands / perPage);

        if (page < 1 || page > totalPages) {
            let ireply = await chat.reply(`INVALID PAGE NUMBER. PLEASE SPECIFY PAGE 1 UP TO ${totalPages}.`);
            ireply.unsend(5000);
            return;
        }

        const startIndex = (page - 1) * perPage;
        const endIndex = Math.min(startIndex + perPage, totalCommands);
        const commandsOnPage = allCommands.slice(startIndex, endIndex);

        let helpMessage = font.bold(`📚 | CMD LIST ${page}-${totalPages}\n`);
        helpMessage += font.bold(`TOTAL COMMANDS: ${totalCommands}\n\n`);

        commandsOnPage.forEach((command, index) => {
            const {
                name, info, usage
            } = command;
            helpMessage += `\t${startIndex + index + 1}. ${font.bold(name)} ${usage ? `${usage}`: ''}\n`;
        });

        helpMessage += `\n• To see another page, use 'HELP [page-number]'\n`;
        helpMessage += `• For more information use "HELP [cmd name]"\n\n`;

        const ireply = await chat.reply(font.thin(helpMessage) + `• If Device Doesn't Support Fonts Reply this message with "unfont"`);
        ireply.unsend(150000);
    } else {
        const selectedCommand = allCommands.find(command => {
            const aliases = command?.aliases || [];
            return command.name?.toLowerCase() === input || aliases?.includes(input);
        });

        if (selectedCommand) {
            const {
                name,
                version,
                role,
                aliases = [],
                info,
                usage,
                isPrefix,
                guide,
                credits,
                cd
            } = selectedCommand;

            const nameMessage = name ? `NAME: ${font.bold(name)}\n`: '';
            const versionMessage = version ? `VERSION: ${version}\n`: '';
            const roleMessage = role !== undefined ? (role === 0 ? 'ROLE: User': (role === 1 ? 'ROLE: Bot-admin owner': (role === 2 ? 'ROLE: Group admins': (role === 3 ? 'ROLE: Super admins/moderators': '')))): '';
            const aliasesMessage = aliases.length ? `\nALIASES: ${aliases.join(', ')}\n`: '';
            const prefixMessage = isPrefix && prefix 
    ? `PREFIX: Required to use ${prefix}\n` 
    : 'PREFIX: Not Required\n';

            const descriptionMessage = info ? `INFO: ${info}\n`: '';
            const usageMessage = usage ? `USAGE: ${usage}\n`: '';
            const guideMessage = guide ? `GUIDE: ${guide}\n`: '';
            const creditsMessage = credits ? `CREDITS: ${credits}\n`: '';
            const cooldownMessage = cd ? `COOLDOWN: ${cd} second(s)\n`: '';

            const message = `COMMAND DETAILS\n\n` + nameMessage + versionMessage + roleMessage + aliasesMessage + prefixMessage + descriptionMessage + usageMessage + guideMessage + creditsMessage + cooldownMessage;
            const ireply = await chat.reply(font.thin(message));
            ireply.unsend(40000);
        } else {
            let ireply = await chat.reply(`COMMAND '${input}' NOT FOUND. USE 'HELP' TO SEE ALL COMMANDS`);
            ireply.unsend(10000);
        }
    }
};


module.exports.handleEvent = async ({ chat, event, font, Utils, prefix }) => {
    const message = event?.body;
    const triggerRegex = /^(@aria|@ai|@meta)/i;
    const allCommands = [...Utils.commands.values()];

    const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const isCommand = allCommands.some(command => {
        const { aliases = [], isPrefix = false } = command;

        if (aliases.length === 0) {
            return false;
        }

        const escapedAliases = aliases.map(alias => escapeRegex(alias));

        const prefixPattern = isPrefix ? prefix : '';
        const commandRegex = new RegExp(`^${prefixPattern}(${escapedAliases.join('|')})`, 'i');
        return message && commandRegex.test(message);
    });

    if (isCommand) return;

    if ((event.isGroup && message && triggerRegex.test(message)) || !event.isGroup) {
        let prompt = event.isGroup ? message.replace(triggerRegex, "").trim() : message;

        if (event.type === "message_reply" && event.messageReply.attachments?.length > 0) {
            return chat.reply(font.monospace("This AI is a text-based model. Please use Gemini for more advanced capabilities."));
        }

        if (event.type === "message_reply" && event.messageReply.body) {
            prompt += `\n\nUser replied mentioning this message: ${event.messageReply.body}`;
        }

        if (!prompt) return;
        try {
            const response = await queryOperaAPI(prompt);
            const formattedAnswer = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
            chat.reply(formattedAnswer || "I'm sorry, I can't answer that question!");
        } catch (error) {
            console.error(error.response?.data?.detail || error.message);
        }
    }
};