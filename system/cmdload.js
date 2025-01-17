const path = require("path");
const fs = require("fs");
const scriptDir = path.join(__dirname, "../script");
const allowedExtensions = [".js", ".ts"];
const loadedModuleNames = new Set();
let autoDelete = true; // Set to `false` to disable auto-delete

async function loadModule(modulePath, Utils, logger, count) {
    try {
        const module = require(modulePath);
        const config = module.config || module.meta;

        if (!config) {
            logger.red(`Module at ${modulePath} does not have a "config" or "meta" property. Skipping...`);
            return count;
        }

        const moduleName = config.name;
        if (!moduleName) {
            logger.red(`Module at ${modulePath} does not have a "name" property in its config or meta. Skipping...`);
            return count;
        }

        if (loadedModuleNames.has(moduleName)) {
            logger.instagram(`Module [${moduleName}] in file [${modulePath}] is already loaded.`);

            if (autoDelete) {
                try {
                    fs.unlinkSync(modulePath);
                    logger.yellow(`Deleted already loaded module file: ${modulePath}`);
                } catch (deleteError) {
                    logger.red(`Failed to delete file: ${modulePath}. Error: ${deleteError.message}`);
                }
            } else {
                logger.yellow(`Module [${moduleName}] is already loaded. Skipping file [${modulePath}] as auto-delete is disabled.`);
            }

            return count;
        }

        loadedModuleNames.add(moduleName);

        const moduleInfo = {
            ...Object.fromEntries(Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])),
            aliases: [...config.aliases || [],
                moduleName],
            name: moduleName,
            role: config.role ?? "0",
            version: config.version ?? "1.0.0",
            isPrefix: config.isPrefix ?? config.usePrefix ?? config.prefix ?? true,
            isPremium: config.isPremium ?? false,
            isPrivate: config.isPrivate ?? false,
            isGroup: config.isGroup ?? false,
            limit: config.limit ?? "5",
            credits: config.credits ?? config.author ?? "",
            cd: config.cd ?? config.cooldowns ?? config.cooldown ?? "5",
            usage: config.usage ?? config.usages ?? "",
            guide: config.guide ?? "",
            info: config.info ?? config.description ?? ""
        };


        if (module.handleEvent) {
            Utils.handleEvent.set(moduleInfo.aliases, {
                ...moduleInfo, handleEvent: module.handleEvent
            });
        }
        if (module.handleReply) {
            Utils.ObjectReply.set(moduleInfo.aliases, {
                ...moduleInfo, handleReply: module.handleReply
            });
        }
        if (module.run) {
            Utils.commands.set(moduleInfo.aliases, {
                ...moduleInfo, run: module.run
            });
        }

        logger.pastel(`LOADED MODULE [${moduleName}]`);
        count++;
    } catch (error) {
        logger.red(`Error loading module at ${modulePath}: ${error.stack}`);
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
            count = await loadModule(filePath, Utils, logger, count);
        }
    }

    return count;
}

async function loadModules(Utils, logger) {
    let count = await loadFromDirectory(scriptDir, Utils, logger, 0);
    logger.pastel(`TOTAL MODULES: [${count}]`);
}

module.exports = {
    loadModules,
    setAutoDelete: (value) => {
        autoDelete = value;
    }
};