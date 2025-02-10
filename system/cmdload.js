const path = require("path");
const fs = require("fs");

const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js", ".ts"];
const loadedModuleNames = new Set();
let autoDelete = true; // Set to `false` to disable auto-delete

async function loadModule(modulePath, Utils, logger, count) {
    try {
        const module = require(modulePath);
        const config = module.config || module.meta || module.manifest;

        if (!config?.name) {
            logger.red(`Module at ${modulePath} is missing required properties. Skipping...`);
            return count;
        }

        const moduleName = config.name;

        if (loadedModuleNames.has(moduleName)) {
            logger.instagram(`Module [${moduleName}] already loaded.`);
            if (autoDelete) {
                try {
                    fs.unlinkSync(modulePath);
                    logger.yellow(`Deleted duplicate module file: ${modulePath}`);
                } catch (err) {
                    logger.red(`Failed to delete ${modulePath}: ${err.message}`);
                }
            }
            return count;
        }

        loadedModuleNames.add(moduleName);

        const moduleInfo = {
            ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])),
            aliases: [...(config.aliases || []), moduleName],
            name: moduleName,
            role: config.role ?? "0",
            version: config.version ?? "1.0.0",
            isPrefix: config.isPrefix ?? config.usePrefix ?? config.prefix ?? true,
            isPremium: config.isPremium ?? false,
            isPrivate: config.isPrivate ?? false,
            isGroup: config.isGroup ?? false,
            type: config.type ?? config.category ?? config.commandCategory ?? "others",
            limit: config.limit ?? "5",
            credits: config.credits ?? config.author ?? "",
            cd: config.cd ?? config.cooldowns ?? config.cooldown ?? "5",
            usage: config.usage ?? config.usages ?? "",
            guide: config.guide ?? "",
            info: config.info ?? config.description ?? "",
        };

        // Handle different function types
        const handlers = {
            handleEvent: module.handleEvent,
            handleReply: module.handleReply || module.onReply,
            run: module.run || module.deploy || module.execute || module.exec || module.onStart,
        };

        for (const [key, func] of Object.entries(handlers)) {
            if (func) {
                moduleInfo.aliases.forEach(alias => {
                    Utils[key === "handleReply" ? "ObjectReply" : key === "handleEvent" ? "handleEvent" : "commands"]
                        .set(alias, { ...moduleInfo, [key]: func });
                });
            }
        }

        logger.rainbow(`LOADED MODULE [${moduleName}]`);
        return count + 1;
    } catch (error) {
        logger.red(`Error loading module at ${modulePath}: ${error.stack}`);
        return count;
    }
}

async function loadFromDirectory(directory, Utils, logger, count) {
    for (const file of fs.readdirSync(directory)) {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        count = stats.isDirectory()
            ? await loadFromDirectory(filePath, Utils, logger, count)
            : allowedExtensions.includes(path.extname(filePath).toLowerCase())
            ? await loadModule(filePath, Utils, logger, count)
            : count;
    }
    return count;
}

async function loadModules(Utils, logger) {
    const count = await loadFromDirectory(scriptDir, Utils, logger, 0);
    logger.rainbow(`TOTAL MODULES: [${count}]`);
}

module.exports = {
    loadModules,
    setAutoDelete: value => (autoDelete = value),
};
