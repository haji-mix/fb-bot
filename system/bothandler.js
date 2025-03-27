const fs = require("fs");
const path = require("path");

async function botHandler({ fonts, chat, api, Utils, logger, event, aliases, admin, global, prefix, userid }) {
    
    const kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));


                    chat.testCo(kokoro_config.author, 2);

                    if (event && event.senderID && event?.body) {
                        const isGroup = event.isGroup || event.threadID !== event.senderID;
                        const idType = isGroup ? "GROUP ID" : "PRIVATE ID";
                        const idValue = isGroup ? event.threadID : event.senderID;

                        let logMessage = `[${idType}]: ${idValue}\n[SENDER ID]: ${event.senderID}\n[MESSAGE]: ${(event?.body || "").trim()}`;

                        logger.rainbow(fonts.origin(logMessage));
                    }

                    const reply = async (msg) => {
                        const msgInfo = await chat.reply(fonts.thin(msg));
                    };

                    const SPAM_THRESHOLD = 6;
                    const TIME_WINDOW = 10 * 1000;

                    if (event && event?.body && event.senderID) {
                        const userId = event.senderID;
                        const message = (event?.body || "").trim();
                        const currentTime = Date.now();

                        if (!Utils.userActivity[userId]) {
                            Utils.userActivity[userId] = {
                                messages: [],
                                warned: false
                            };
                        }

                        Utils.userActivity[userId].messages = Utils.userActivity[userId].messages.filter(
                            (msg) => currentTime - msg.timestamp <= TIME_WINDOW
                        );


                        Utils.userActivity[userId].messages.push({
                            message,
                            timestamp: currentTime
                        });

                        const recentMessages = Utils.userActivity[userId].messages.map((msg) => msg.message);
                        const repeatedMessages = recentMessages.filter((msg) => msg === message);

                        const configPath = path.join(__dirname, './kokoro.json');
                        if (!kokoro_config.blacklist) kokoro_config.blacklist = [];

                        if (kokoro_config.blacklist.includes(event.senderID)) return;

                        if (repeatedMessages.length === 10) {
                            kokoro_config.blacklist.push(event.senderID);
                            fs.writeFile(configPath, JSON.stringify(kokoro_config, null, 2), 'utf-8', (err) => {
                                if (err) console.error('Error writing file:', err);
                            });
                            reply(`UserID: ${userId}, You have been Banned for Spamming.`);
                            return;
                        }

                        if (repeatedMessages.length >= SPAM_THRESHOLD) {
                            if (!Utils.userActivity[userId].warned) {
                                reply(`Warning to userID: ${userId} Please stop spamming!`);
                                Utils.userActivity[userId].warned = true;
                            }
                            return;
                        }

                        Utils.userActivity[userId].warned = false;
                    }




                    const historyPath = './data/history.json';

                    let history;
                    if (fs.existsSync(historyPath)) {
                        history = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
                    } else {
                        history = {};
                    }


                    let isPrefix =
                        event?.body &&
                            aliases(
                                (event?.body || "").trim().toLowerCase()
                                    .split(/ +/)
                                    .shift()
                            )?.isPrefix == false
                            ? "" : prefix;
let [command, ...args] = [];
const body = (event?.body || "").trim();

if (typeof isPrefix === 'string' && body.toLowerCase().startsWith(isPrefix.toLowerCase())) {
    // Remove prefix (case insensitive) and trim
    const prefixRemoved = body.slice(isPrefix.length).trim();
    
    // Split by whitespace (including multiple spaces), but filter out empty strings
    const parts = prefixRemoved.split(/\s+/).filter(Boolean);
    
    if (parts.length > 0) {
        command = parts[0].toLowerCase();
        args = parts.slice(1);
    }
}

                    if (isPrefix && aliases(command)?.isPrefix === false) {
                        reply(
                            `this command doesn't need a prefix set by author.`
                        );
                        return;
                    }

                    const maintenanceEnabled = kokoro_config?.maintenance?.enabled ?? false;

                    if (
                        event &&
                        event?.body &&
                        (
                            (command && command.toLowerCase && aliases(command.toLowerCase())?.name) ||
                            (event?.body.startsWith(prefix) && aliases(command?.toLowerCase())?.name) ||
                            event?.body.startsWith(prefix?.toLowerCase())
                        )
                    ) {
                        const role = aliases(command)?.role ?? 0;
                        const senderID = event.senderID;

                        const super_admin =
                            kokoro_config?.admins.includes(
                                event.senderID
                            );

                        const bot_owner = ((admin ?? []).includes(event.senderID)) || super_admin;


                        const threadInfo = await chat.threadInfo(event.threadID);

                        const adminIDs = (threadInfo?.adminIDs || []).map(admin => admin.id);

                        const group_admin = adminIDs.includes(event.senderID) || bot_owner || super_admin;

                        const excludes_mod = super_admin || bot_owner;

                        if (kokoro_config?.blacklist.includes(event.senderID)) {
                            return;
                        }

                        if (maintenanceEnabled && !excludes_mod) {
                            return reply(`Our system is currently undergoing maintenance. Please try again later!`);
                        }
                        const warning = fonts.bold("[You don't have permission!]\n\n");

                        if (role === 1 && !bot_owner) {
                            reply(warning + `Only the bot owner/admin have access to this command.`);
                            return;
                        }

                        if (role === 2 && !group_admin) {
                            return reply(warning + `Only group admin have access to this command.`);
                        }

                        if (role === 3 && !super_admin) {
                            return reply(warning + `Only moderators/super_admins/site_owner have access to this command.`);
                        }


                    }

                    if (aliases(command)?.isGroup === true) {
                        if (!event.isGroup) {
                            return reply("You can only use this command in group chats.");
                        }
                    }

                    if (aliases(command)?.isPrivate === true) {
                        if (event.isGroup) {
                            return reply("You can only use this command in private chat.");
                        }
                    }

                    const premiumDataPath = './data/premium.json';
                    let premium;

                    if (fs.existsSync(premiumDataPath)) {
                        premium = JSON.parse(fs.readFileSync(premiumDataPath, 'utf8'));
                    } else {
                        premium = {};
                    }

                    const senderID = event.senderID;
                    const commandName = aliases(command)?.name;
                    const currentTime = Date.now();
                    const oneDay = 25 * 60 * 1000;

                    /* 24 * 60 * 60 * 1000;  24 hours in milliseconds*/

                    // Check if the command requires a premium user
                    if (aliases(command)?.isPremium === true) {
                        // Check if the sender is a premium user or an admin
                        const isAdmin = admin.includes(senderID) || (kokoro_config?.admins.includes(senderID));
                        const isPremiumUser = premium[senderID];

                        if (!isAdmin && !isPremiumUser) {
                            const usageKey = `${senderID + userid}`;
                            const usageInfo = Utils.limited.get(usageKey);

                            if (usageInfo) {
                                const timeElapsed = currentTime - usageInfo.timestamp;
                                if (timeElapsed >= oneDay) {
                                    Utils.limited.set(usageKey, {
                                        count: 0, timestamp: currentTime
                                    });
                                }
                            } else {
                                Utils.limited.set(usageKey, {
                                    count: 0, timestamp: currentTime
                                });
                            }

                            const updatedUsageInfo = Utils.limited.get(usageKey);
                            if (updatedUsageInfo.count >= aliases(command)?.limit) {
                                return reply(`Limit Reached: This command is available up to ${aliases(command)?.limit} times per 25 minutes for standard users. To access unlimited usage, please upgrade to our Premium version. For more information, contact us directly or use callad!`);
                            } else {
                                Utils.limited.set(usageKey, {
                                    count: updatedUsageInfo.count + 1, timestamp: Date.now()
                                });
                            }
                        }
                    }

                    if (event && event?.body && aliases(command)?.name) {
                        const now = Date.now();
                        const name = aliases(command)?.name;
                        const cooldownKey = `${event.senderID}_${name}_${userid}`;
                        const sender = Utils.cooldowns.get(cooldownKey);
                        const delay = aliases(command)?.cd ?? 0;

                        if (!sender || now - sender.timestamp >= delay * 1000) {

                            Utils.cooldowns.set(cooldownKey, {
                                timestamp: now,
                                command: name,
                                warned: false
                            });
                        } else {
                            const active = Math.ceil((sender.timestamp + delay * 1000 - now) / 1000);

                            if (!sender.warned) {
                                reply(`Please wait ${active} second(s) before using the "${name}" command again.`);
                                sender.warned = true;
                                Utils.cooldowns.set(cooldownKey, sender);
                            }

                            return;
                        }
                    }


                    if (event && event.type === "message_reaction") {
                        if (event.senderID === userid && ["🗑️", "🚮", "👎"].includes(event.reaction)) {
                            return api.unsendMessage(event.messageID);
                        }
                    }

                    if (event && event?.body &&
                        !command &&
                        event?.body
                            ?.toLowerCase()
                            .startsWith(prefix?.toLowerCase())) {
                        return reply(
                            `Invalid command please use help to see the list of available commands.`
                        );
                    }

                    if (event && event?.body &&
                        command &&
                        prefix &&
                        event?.body
                            ?.toLowerCase()
                            .startsWith(prefix?.toLowerCase()) &&
                        !aliases(command)?.name) {
                        return reply(
                            `Invalid command '${command}' please use ${prefix}help to see the list of available commands.`
                        );
                    }

                    for (const { handleEvent, name } of Utils.handleEvent.values()) {
                        if (handleEvent && name) {
                            try {
                                await handleEvent({
                                    logger,
                                    api,
                                    event,
                                    args,
                                    chat, box: chat,
                                    message: chat,
                                    fonts,
                                    font: fonts,
                                    admin,
                                    global,
                                    prefix,
                                    Utils
                                });
                            } catch (error) {
                                logger.red(`Something wen't wrong with the handleEvent '${name}' error: ` + error.stack);
                            }
                        }
                    }

                    switch (event.type) {
                        case "message":
                        case "message_unsend":
                        case "message_reaction":
                        case "message_reply":
                        case "message_reply":
                            if (aliases(command?.toLowerCase())?.name) {
                                try {
                                    logger.rainbow(`[${aliases(command?.toLowerCase())?.name.toUpperCase()}] [CMD] [EXECUTED ✓]`);
                                    Utils.handleReply.findIndex(
                                        reply => reply.author === event.senderID
                                    ) !== -1
                                        ? (api.unsendMessage(
                                            Utils.handleReply.find(
                                                reply =>
                                                    reply.author ===
                                                    event.senderID
                                            ).messageID
                                        ),
                                            Utils.handleReply.splice(
                                                Utils.handleReply.findIndex(
                                                    reply =>
                                                        reply.author ===
                                                        event.senderID
                                                ),
                                                1
                                            )) : null;

                                    await (
                                        aliases(command?.toLowerCase())?.run ||
                                        (() => { })
                                    )({
                                        logger,
                                        api,
                                        event,
                                        args,
                                        chat, box: chat,
                                        message: chat,
                                        fonts,
                                        font: fonts,
                                        admin,
                                        global,
                                        prefix,
                                        Utils
                                    });
                                } catch (error) {
                                    const error_msg = `Something wen't wrong with the command '${aliases(command?.toLowerCase())?.name}' please contact admins/mods or use 'callad' [report issue here! or your message.]\n\nERROR: ${error.stack}`;
                                    reply(error_msg);
                                    logger.red(`Something wen't wrong with the command '${aliases(command?.toLowerCase())?.name}' error: ` + error.stack);
                                    for (const adminID of kokoro_config.admins) {
            await chat.send(error_msg, adminID);
        }
                                }
                            }
                            for (const {
                                handleReply
                            } of Utils.ObjectReply.values()) {
                                if (
                                    Array.isArray(Utils.handleReply) &&
                                    Utils.handleReply.length > 0
                                ) {
                                    try {
                                    if (!event.messageReply) return;
                                    const indexOfHandle =
                                        Utils.handleReply.findIndex(
                                            reply =>
                                                reply.author ===
                                                event.messageReply.senderID
                                        );
                                    if (indexOfHandle !== -1) return;
                                    await handleReply({
                                        logger,
                                        api,
                                        event,
                                        args,
                                        chat,
                                        box: chat,
                                        message: chat,
                                        fonts,
                                        font: fonts,
                                        global,
                                        admin,

                                        prefix,

                                        Utils,
                                    });
                                } catch (error) {
                                    logger.red(`Something wen't wrong with the handleReply error: ` + error.stack);
                                }
                                }
                            }
                            break;
                    }
                    
                    }
                    
                    
                    module.exports = { botHandler };