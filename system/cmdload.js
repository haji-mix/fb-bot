const path = require("path");
const fs = require("fs");

const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js", ".ts"];
const loadedModuleNames = new Set();
let autoDelete = false; // Set to `false` to disable auto-delete

async function loadModule(modulePath, Utils, logger) {
    try {
        const module = require(modulePath);
        const config = module.config || module.meta || module.manifest;

        if (!config?.name) {
            logger.red(`Module at ${modulePath} is missing required properties. Skipping...`);
            return 0;
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
            return 0;
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
        return 1;
    } catch (error) {
        logger.red(`Error loading module at ${modulePath}: ${error.stack}`);
        return 0;
    }
}

async function loadFromDirectory(directory, Utils, logger) {
    const files = fs.readdirSync(directory);
    
    const promises = files.map(async (file) => {
        const filePath = path.join(directory, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
            return loadFromDirectory(filePath, Utils, logger);
        } else if (allowedExtensions.includes(path.extname(filePath).toLowerCase())) {
            return loadModule(filePath, Utils, logger);
        }
        return 0;
    });

    const results = await Promise.all(promises);
    return results.reduce((total, count) => total + count, 0);
}

async function loadModules(Utils, logger) {
    const count = await loadFromDirectory(scriptDir, Utils, logger);
    logger.rainbow(`TOTAL MODULES: [${count}]`);
}

module.exports = {
    loadModules,
    setAutoDelete: value => (autoDelete = value),
};
