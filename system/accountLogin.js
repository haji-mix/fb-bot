
const fs = require("fs");
let kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));
const config = fs.existsSync("./data/config.json") ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();

async function accountLogin(state, prefix, admin = [], email, password, Utils) {
    const global = await workers();

    return new Promise((resolve, reject) => {
        const loginOptions = state
        ? {
            appState: state
        }: email && password
        ? {
            email: email, password: password
        }: null;

        if (!loginOptions) {
            reject(new Error('Either appState or email/password must be provided.'));
            return;
        }

        login(loginOptions, async (error, api) => {
            if (error) {
                reject(error);
                return;
            }

            let appState = state;

            if (!state && email && password) {
                appState = api.getAppState();
            }

            const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;

            let admin_uid = admin;

            if (facebookLinkRegex.test(admin)) {
                try {
                    admin_uid = await api.getUID(admin);
                } catch (uidError) {
                    admin_uid = admin;
                }
            }

            const userid = await api.getCurrentUserID();
            await addThisUser(userid, appState, prefix, admin_uid);
            try {

                let time = (
                    JSON.parse(
                        fs.readFileSync("./data/history.json", "utf-8")
                    ).find(user => user.userid === userid) || {}
                ).time || 0;

                Utils.account.set(userid, {
                    name: "ANONYMOUS",
                    userid: userid,
                    profile_img: `https://graph.facebook.com/${userid}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
                    profile_url: `https://facebook.com/${userid}`,
                    time: time,
                    online: true
                });

                const intervalId = setInterval(() => {
                    try {
                        const account = Utils.account.get(userid);
                        if (!account) throw new Error("Account not found");
                        Utils.account.set(userid, {
                            ...account,
                            time: account.time + 1
                        });
                    } catch (error) {
                        clearInterval(intervalId);
                        return;
                    }
                },
                    1000);

                const cronjob = require('./system/cronjob')({
                    api,
                    fonts,
                    font: fonts,
                });
                
                const notevent = require('./system/notevent')({
                    api,
                    fonts,
                    font: fonts,
                    prefix
                });

                const {
                    listenEvents, logLevel, updatePresence, selfListen, forceLogin, online, autoMarkDelivery, autoMarkRead, userAgent
                } = config[0].fcaOption;

                api.setOptions({
                    listenEvents,
                    logLevel,
                    updatePresence,
                    selfListen,
                    forceLogin,
                    userAgent,
                    online,
                    autoMarkDelivery,
                    autoMarkRead
                });

                try {
                    api.listenMqtt(async (error, event) => {
                        if (error) {
                            if (error.error === "Not logged in") {

                                Utils.account.delete(userid);
                                deleteThisUser(userid);

                                return;
                            }
                            return process.exit(0);
                        }

                        const chat = new OnChat(api, event);
                        kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));

                        if (event && event.senderID && event.body) {
                            const idType = event.isGroup ? "ThreadID": "UserID";
                            const idValue = event.isGroup ? event.threadID: event.senderID;

                            logger.instagram(fonts.origin(`${idType}: ${idValue}\nMessage: ${(event.body || "").trim()}`));
                        }



                        const reply = async (msg) => {
                            const msgInfo = await chat.reply(fonts.thin(msg));
                            msgInfo.unsend(15000);
                        };



                        const SPAM_THRESHOLD = 6;
                        const TIME_WINDOW = 10 * 1000;

                        if (event && event.body && event.senderID) {
                            const userId = event.senderID;
                            const message = (event.body || "").trim();
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

                            // Add the new message
                            Utils.userActivity[userId].messages.push({
                                message,
                                timestamp: currentTime
                            });

                            // Check for spam
                            const recentMessages = Utils.userActivity[userId].messages.map((msg) => msg.message);
                            const repeatedMessages = recentMessages.filter((msg) => msg === message);

                            if (repeatedMessages.length >= SPAM_THRESHOLD) {
                                if (!Utils.userActivity[userId].warned) {
                                    reply(`Warning to userID: ${userId} Please stop spamming!`);
                                    Utils.userActivity[userId].warned = true; // Warn the user only once
                                }
                                return; // Ignore further reactions
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

                        let blacklist =
                        (
                            history.find(
                                blacklist => blacklist.userid === userid
                            ) || {}
                        ).blacklist || [];

                        let isPrefix =
                        event.body &&
                        aliases(
                            (event.body || "").trim().toLowerCase()
                            .split(/ +/)
                            .shift()
                        )?.isPrefix == false
                        ? "": prefix;

                        let [command,
                            ...args] = (event.body || "")
                        .trim()
                        .toLowerCase()
                        .startsWith(isPrefix?.toLowerCase())
                        ? (event.body || "")
                        .trim()
                        .substring(isPrefix?.length)
                        .trim()
                        .split(/\s+/)
                        .map(arg => arg.trim()): [];

                        if (isPrefix && aliases(command)?.isPrefix === false) {
                            await reply(
                                `this command doesn't need a prefix set by author.`
                            );
                            return;
                        }

                        const maintenanceEnabled = kokoro_config?.maintenance?.enabled ?? false;

                        if (event && event.body && aliases(command?.toLowerCase())?.name) {
                            const role = aliases(command)?.role ?? 0;
                            const senderID = event.senderID;

                            const super_admin =
                            kokoro_config?.admins.includes(
                                event.senderID
                            );

                            const bot_owner = (Array.isArray(admin) && admin.includes(event.senderID)) || super_admin;


                            const threadInfo = await chat.threadInfo(event.threadID);

                            const adminIDs = (threadInfo?.adminIDs || []).map(admin => admin.id);

                            const group_admin = adminIDs.includes(event.senderID) || bot_owner || super_admin;

                            const excludes_mod = super_admin || bot_owner;

                            if (maintenanceEnabled && !excludes_mod) {
                                await reply(`Our system is currently undergoing maintenance. Please try again later!`);
                                return;
                            }
                            const warning = fonts.bold("[You don't have permission!]\n\n");

                            if (role === 1 && !bot_owner) {
                                await reply(warning + `Only the bot owner/admin have access to this command.`);
                                return;
                            }

                            if (role === 2 && !group_admin) {
                                await reply(warning + `Only group admin have access to this command.`);
                                return;
                            }

                            if (role === 3 && !super_admin) {
                                await reply(warning + `Only moderators/super_admins/site_owner have access to this command.`);
                                return;
                            }

                        }



                        if (event && event.body && event.body
                            ?.toLowerCase()
                            .startsWith(prefix.toLowerCase()) &&
                            aliases(command)?.name) {
                            if (blacklist?.includes(event.senderID)) {
                                await reply(
                                    "We're sorry, but you've been banned from using bot. If you believe this is a mistake or would like to appeal, please contact one of the bot admins for further assistance."
                                );
                                chat.react("🖕");
                                return;
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
                                    await reply(`Limit Reached: This command is available up to ${aliases(command)?.limit} times per 25 minutes for standard users. To access unlimited usage, please upgrade to our Premium version. For more information, contact us directly at ` + `https://www.facebook.com/haji.atomyc2727`);
                                    return;
                                } else {
                                    Utils.limited.set(usageKey, {
                                        count: updatedUsageInfo.count + 1, timestamp: Date.now()
                                    });
                                }
                            }
                        }

                        if (event && event.body && aliases(command)?.name) {
                            const now = Date.now();
                            const name = aliases(command)?.name;
                            const sender = Utils.cooldowns.get(
                                `${event.senderID + userid}`
                            );
                            const delay = aliases(command)?.cd ?? 0;

                            if (!sender || now - sender.timestamp >= delay * 1000) {
                                Utils.cooldowns.set(
                                    `${event.senderID + userid}`,
                                    {
                                        timestamp: now,
                                        command: name
                                    }
                                );
                            } else {
                                const active = Math.ceil(
                                    (sender.timestamp + delay * 1000 - now) /
                                    1000
                                );
                                await reply(
                                    `Please wait ${active} second(s) before using the "${name}" command again.`
                                );
                                return;
                            }
                        }


                        let activeThreadID = null;

                        if (kokoro_config.typingbot) {
                            if (event && event.type === "typ") {
                                if (event.isTyping) {
                                    if (activeThreadID !== event.threadID) {
                                        activeThreadID = event.threadID;
                                        api.sendTypingIndicator(event.threadID, () => {});
                                    }
                                } else {
                                    if (activeThreadID === event.threadID) {
                                        api.sendTypingIndicator(event.threadID, false);
                                        activeThreadID = null;
                                    }
                                }
                            }
                        }

                        if (event?.type === 'message_reaction' && event?.userID !== api.getCurrentUserID()) {

                            setTimeout(function() {
                                return api.setMessageReaction(event.reaction, event.messageID, (err) => {}, true);
                            }, 5000);
                        }


                        if (event && event.type === "message_reaction") {
                            if (event.senderID === userid && ["🗑️", "🚮", "👎"].includes(event.reaction)) {
                                return api.unsendMessage(event.messageID);
                            }
                        }

                        if (event && event.body &&
                            !command &&
                            event.body
                            ?.toLowerCase()
                            .startsWith(prefix.toLowerCase())) {
                            await reply(
                                `Invalid command please use help to see the list of available commands.`
                            );
                            return;
                        }

                        if (event && event.body &&
                            command &&
                            prefix &&
                            event.body
                            ?.toLowerCase()
                            .startsWith(prefix.toLowerCase()) &&
                            !aliases(command)?.name) {
                            await reply(
                                `Invalid command '${command}' please use ${prefix}help to see the list of available commands.`
                            );
                            return;
                        }

                        for (const {
                            handleEvent,
                            name
                        } of Utils.handleEvent.values()) {
                            if (handleEvent && name) {
                                handleEvent({
                                    api,
                                    chat,
                                    message: chat,
                                    box: chat,
                                    fonts,
                                    font: fonts,
                                    global,
                                    event,
                                    admin,
                                    prefix,
                                    blacklist,
                                    Utils,
                                });
                            }
                        }

                        switch (event.type) {
                            case "message":
                                case "message_unsend":
                                    case "message_reaction":
                                        case "message_reply":
                                            case "message_reply":
                                                if (aliases(command?.toLowerCase())?.name) {
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
                                                        )): null;
                                                    await (
                                                        aliases(command?.toLowerCase())?.run ||
                                                        (() => {})
                                                    )({
                                                            api,
                                                            event,
                                                            args,
                                                            chat, box: chat,
                                                            message: chat,
                                                            fonts,
                                                            font: fonts,
                                                            global,
                                                            admin,
                                                            prefix,
                                                            blacklist,
                                                            Utils,

                                                        });
                                                }
                                                for (const {
                                                    handleReply
                                                } of Utils.ObjectReply.values()) {
                                                    if (
                                                        Array.isArray(Utils.handleReply) &&
                                                        Utils.handleReply.length > 0
                                                    ) {
                                                        if (!event.messageReply) return;
                                                        const indexOfHandle =
                                                        Utils.handleReply.findIndex(
                                                            reply =>
                                                            reply.author ===
                                                            event.messageReply.senderID
                                                        );
                                                        if (indexOfHandle !== -1) return;
                                                        await handleReply({
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
                                                            blacklist,
                                                            Utils,
                                                        });
                                                    }
                                                }
                                                break;
                                    }
                            });
                    } catch (error) {
                        Utils.account.delete(userid);
                        deleteThisUser(userid);

                        return;
                    }

                        resolve();
                    } catch (error) {
                        logger.red(error);
                    }

                }
            );
        });
    }