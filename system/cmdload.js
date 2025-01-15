const path = require("path");
const fs = require("fs");
const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js", ".ts"];
const loadedModuleNames = new Set(); // Track loaded module names

async function loadModule(modulePath, Utils, logger, count) {
    try {
        const {
            config,
            run,
            handleEvent,
            handleReply
        } = require(modulePath);

        const moduleName = config.name;
        if (loadedModuleNames.has(moduleName)) {
            logger.instagram(`Module [${moduleName}] in file [${modulePath}] is already loaded. Skipping...`);
            return count;
        }

        loadedModuleNames.add(moduleName);

        const moduleInfo = {
            ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])),
            aliases: [...config.aliases || [], moduleName],
            name: moduleName || [],
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

        if (handleEvent) Utils.handleEvent.set(moduleInfo.aliases, {
            ...moduleInfo, handleEvent
        });
        if (handleReply) Utils.ObjectReply.set(moduleInfo.aliases, {
            ...moduleInfo, handleReply
        });
        if (run) Utils.commands.set(moduleInfo.aliases, {
            ...moduleInfo, run
        });

        count++;
    } catch (error) {
        logger.instagram(`Error loading module at ${modulePath}: ${error.stack}`);
    }
    return count;
}

async function loadFromDirectory(directory, Utils, logger, count) {
    const files = fs.readdirSync(directory);
    for (const file of files) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            count = await loadFromDirectory(filePath, Utils, logger, count);
        } else if (allowedExtensions.includes(path.extname(filePath).toLowerCase())) {
            const formattedName = file.replace(/\.(js|ts)$/i, "").toUpperCase();
            logger.pastel(`LOADED MODULE [${formattedName}]`);
            count = await loadModule(filePath, Utils, logger, count);
        }
    }

    return count;
}

async function loadModules(Utils, logger) {
    let count = await loadFromDirectory(scriptDir, Utils, logger, 0);
    logger.pastel(`TOTAL MODULES: ${count}`);
}

module.exports = {
    loadModules
};
