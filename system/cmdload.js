const path = require("path");
const fs = require("fs");
const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js", ".ts"];

async function loadModule(modulePath, Utils, logger) {
    try {
        const { config, run, handleEvent, handleReply } = require(modulePath);
        const moduleInfo = {
            ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])),
            aliases: [...config.aliases || [], config.name],
            name: config.name || [],
            role: config.role || "0",
            version: config.version || "1.0.0",
            isPrefix: config.isPrefix ?? true,
            isPremium: config.isPremium ?? false,
            isPrivate: config.isPrivate ?? false,
            isGroup: config.isGroup ?? false,
            limit: config.limit || "5",
            credits: config.credits || "",
            cd: config.cd || "5",
            usage: config.usage || "",
            guide: config.guide || "",
            info: config.info || ""
        };

        if (handleEvent) Utils.handleEvent.set(moduleInfo.aliases, { ...moduleInfo, handleEvent });
        if (handleReply) Utils.ObjectReply.set(moduleInfo.aliases, { ...moduleInfo, handleReply });
        if (run) Utils.commands.set(moduleInfo.aliases, { ...moduleInfo, run });

    } catch (error) {
        logger.red(`Error loading module at ${modulePath}: ${error.stack}`);
    }
}

async function loadFromDirectory(directory, Utils, logger) {
    const files = fs.readdirSync(directory);
    const loadPromises = files.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            await loadFromDirectory(filePath, Utils, logger);
        } else if (allowedExtensions.includes(path.extname(filePath).toLowerCase())) {
            const formattedName = file.replace(/\.(js|ts)$/i, "").toUpperCase();
            logger.green(`LOADING MODULE••• [${formattedName}]`);
            await loadModule(filePath, Utils, logger);
        }
    });

    await Promise.all(loadPromises);
}

async function loadModules(Utils, logger) {
    await loadFromDirectory(scriptDir, Utils, logger);
}

module.exports = { loadModules };
