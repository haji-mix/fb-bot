const path = require("path");
const fs = require("fs");

const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js"]; // Removed .ts from allowed extensions
const loadedModuleNames = new Set();
let autoDelete = true; // Set to `false` to disable auto-delete

// Utility function to clear module cache
function clearModuleCache(modulePath) {
    delete require.cache[require.resolve(modulePath)];
}

async function loadModule(modulePath, Utils, logger, count) {
    try {
        // Prevent caching issues
        clearModuleCache(modulePath);
        const module = require(modulePath);
        const config = module.config || module.meta || module.manifest || module.metadata || module;

        if (!config) {
            logger.error(`Module at ${modulePath} does not have a "config" or "meta" property. Skipping...`);
            return count;
        }

        const moduleName = config.name;
        if (!moduleName) {
            logger.error(`Module at ${modulePath} does not have a "name" property in its config or meta. Skipping...`);
            return count;
        }

        if (loadedModuleNames.has(moduleName)) {
            logger.kleurBlue(`Module [${moduleName}] in file [${modulePath}] is already loaded.`);

            if (autoDelete) {
                try {
                    fs.unlinkSync(modulePath);
                    logger.chalk.yellow(`Deleted already loaded module file: ${modulePath}`);
                } catch (deleteError) {
                    logger.error(`Failed to delete file: ${modulePath}. Error: ${deleteError.message}`);
                }
            } else {
                logger.chalk.yellow(`Module [${moduleName}] is already loaded. Skipping file [${modulePath}] as auto-delete is disabled.`);
            }

            return count;
        }

        loadedModuleNames.add(moduleName);

        // Normalize module configuration
        const moduleInfo = {
            ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])),
            aliases: [...(config.aliases || []), moduleName],
            name: moduleName,
            role: config.role ?? config.permission ?? config.hasPermission ?? "0",
            version: config.version ?? "1.0.0",
            isPrefix: config.isPrefix ?? config.usePrefix ?? config.prefix ?? config.hasPrefix ?? true,
            isPremium: config.isPremium ?? false,
            isPrivate: config.isPrivate ?? false,
            isGroup: config.isGroup ?? false,
            type: config.type ?? config.category ?? config.commandCategory ?? "others",
            limit: config.limit ?? "10",
            credits: config.credits ?? config.author ?? "",
            cd: config.cd ?? config.cooldowns ?? config.cooldown ?? config.countDown ?? "5",
            usage: config.usage ?? config.usages ?? "",
            guide: config.guide ?? "",
            info: config.info ?? config.description ?? ""
        };

        // Store different handlers efficiently
        const eventFunction = module.handleEvent || module.onEvent || module.onListen || module.listener;
        if (eventFunction) {
            Utils.handleEvent.set(moduleInfo.aliases, { ...moduleInfo, handleEvent: eventFunction });
        }

        const replyFunction = module.handleReply || module.onReply;
        if (replyFunction) {
            Utils.ObjectReply.set(moduleInfo.aliases, { ...moduleInfo, handleReply: replyFunction });
        }

        const executeFunction = module.run || module.deploy || module.onDeploy || module.execute || module.exec || module.onStart || module.onRun || module.initialize || module.init;
        if (executeFunction) {
            Utils.commands.set(moduleInfo.aliases, { ...moduleInfo, run: executeFunction });
        }

        logger.success(`LOADED MODULE [${moduleName.toUpperCase()}]`);
        return count + 1;
    } catch (error) {
        logger.error(`Error loading module at ${modulePath}: ${error.stack}`);
        return count;
    }
}

async function loadFromDirectory(directory, Utils, logger, count) {
    try {
        const files = fs.readdirSync(directory);
        const modulePromises = files.map(async (file) => {
            const filePath = path.join(directory, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                return loadFromDirectory(filePath, Utils, logger, count);
            } else if (allowedExtensions.includes(path.extname(filePath).toLowerCase())) {
                return loadModule(filePath, Utils, logger, count);
            }
        });

        const results = await Promise.all(modulePromises);
        return results.reduce((sum, value) => sum + (value || 0), count);
    } catch (error) {
        logger.error(`Error reading directory: ${directory}. Error: ${error.message}`);
        return count;
    }
}

async function loadModules(Utils, logger) {
    let count = await loadFromDirectory(scriptDir, Utils, logger, 0);
    logger.success(`TOTAL MODULES LOADED: [${count}]`);
}

module.exports = {
    loadModules,
    setAutoDelete: (value) => {
        autoDelete = value;
    }
};