const path = require("path");
const fs = require("fs");
const script = path.join(__dirname, "../script");


async function loadModule(modulePath, eventType, Utils) {
    const {
        config,
        run,
        handleEvent,
        handleReply
    } = require(modulePath);

    const {
        name = [],
        role = "0",
        version = "1.0.0",
        isPrefix = true,
        isPremium = false,
        isPrivate = false,
        isGroup = false,
        limit = "5",
        aliases = [],
        info = "",
        usage = "",
        guide = "",
        credits = "",
        cd = "5"
    } = Object.fromEntries(
        Object.entries(config).map(([key, value]) => [key?.toLowerCase(), value])
    );

    aliases.push(name);

    const moduleInfo = {
        name,
        role,
        aliases,
        info,
        usage,
        guide,
        version,
        isPrefix: config.isPrefix,
        isPremium: config.isPremium,
        isGroup: config.isGroup,
        isPrivate: config.isPrivate,
        limit,
        credits,
        cd
    };

    if (handleEvent) Utils.handleEvent.set(aliases, {
        ...moduleInfo, handleEvent
    });
    if (handleReply) Utils.ObjectReply.set(aliases, {
        ...moduleInfo, handleReply
    });
    if (run) Utils.commands.set(aliases, {
        ...moduleInfo, run
    });
}

async function loadModules(Utils, logger) {
    const files = fs.readdirSync(script);
    const loadPromises = files.map(async file => {
        const modulePath = path.join(script, file);
        const stats = fs.statSync(modulePath);

        if (stats.isDirectory()) {
            const nestedFiles = fs.readdirSync(modulePath);
            await Promise.all(
                nestedFiles.map(async nestedFile => {
                    const filePath = path.join(modulePath, nestedFile);
                    if ([".js", ".ts"].includes(path.extname(filePath)?.toLowerCase())) {
                        logger(
                            `[${nestedFile?.toUpperCase().replace(".JS", "").replace(".TS", "")}]`
                        );
                        try {
                            await loadModule(filePath, "event", Utils);
                        } catch (error) {
                            logger(
                                `[${nestedFile}]: ${error.stack}`
                            );
                        }
                    }
                })
            );
        } else if ([".js", ".ts"].includes(path.extname(modulePath)?.toLowerCase())) {
            logger(
                `[${file?.toUpperCase().replace(".JS", "").replace(".TS", "")}]`
            );
            try {
                await loadModule(modulePath, Utils);
            } catch (error) {
                logger(`[${file?.toUpperCase().replace(".JS", "").replace(".TS", "")}]: ${error.stack}`);
            }
        }
    });

    await Promise.all(loadPromises);
}

module.exports = {
    loadModules
}