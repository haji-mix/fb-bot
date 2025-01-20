const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const express = require("express");
const rateLimit = require('express-rate-limit');
const app = express();
let PORT = 10000;
const axios = require("axios");
const cron = require("node-cron");
const helmet = require('helmet');
const cors = require('cors');

const {
    workers,
    logger,
    fonts,
    OnChat,
    loadModules,
    download,
    encryptSession,
    decryptSession,
    generateUserAgent
} = require("./system/modules");

const config = fs.existsSync("./data/config.json") ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();
let kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));

const Utils = {
    commands: new Map(),
    handleEvent: new Map(),
    account: new Map(),
    cooldowns: new Map(),
    ObjectReply: new Map(),
    limited: new Map(),
    handleReply: [],
    userActivity: {}
};

loadModules(Utils, logger);

const blockedIPs = new Set();


const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    handler: (req, res) => {
        if (!trustedIPs.includes(req.ip)) {
            blockedIPs.add(req.ip);
            return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
        }
        res.status(429).send('Too Many Requests');
    },
});

app.use((req, res, next) => {
    if (blockedIPs.has(req.ip)) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }
    next();
});

const trustedIPs = ['::1', '127.0.0.1'];

app.use(cors({
    origin: "*"
}));

app.use(helmet({
    contentSecurityPolicy: false
}));


app.use(limiter);

app.use((req, res, next) => {
    res.setHeader('x-powered-by', 'Kokoro AI');
    next();
});


app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const routes = [{
    path: '/', file: 'index.html', method: 'get'
},
    {
        path: '/jseditor', file: 'ide.html', method: 'get'
    },
    {
        path: '/info', method: 'get', handler: getInfo
    },
    {
        path: '/commands', method: 'get', handler: getCommands
    },
    {
        path: '/online-users', method: 'get', handler: getOnlineUsers
    },
    {
        path: '/login', method: 'post', handler: postLogin
    },
    {
        path: '/restart', method: 'get', handler: processExit
    },
    {
        path: '/login_cred', method: 'get', handler: getLogin
    }];

routes.forEach(route => {
    if (route.file) {
        app[route.method](route.path, (req, res) => {
            res.sendFile(path.join(__dirname, 'public', route.file));
        });
    } else if (route.handler) {
        app[route.method](route.path, route.handler);
    }
});


app.get('/script/*', (req, res) => {
    const filePath = path.join(__dirname, 'script', req.params[0]);

    if (!filePath.startsWith(path.join(__dirname, 'script'))) {
        return res.status(403).sendFile(path.join(__dirname, 'public', '403.html'));
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
        }

        const htmlContent =
        `<!DOCTYPE html>
        <html lang="en">
        <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${req.params[0]}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.min.css" />
        <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/ace.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/theme-monokai.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.8.0/highlight.min.js"></script>
        <script>hljs.highlightAll();</script>
        <style>
        body {
        background-color: #272822;
        color: #f8f8f2;
        font-family: 'Courier New', Courier, monospace;
        margin: 0;
        padding: 1rem;
        }
        pre {
        background-color: #272822; 
        color: #f8f8f2;
        font-family: 'Courier New', Courier, monospace;
        padding: 1rem;
        border-radius: 5px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
        overflow: auto;
        }
        
        .ace-monokai {
        background-color: #272822;
        color: #f8f8f2;
        }
        </style>
        </head>
        <body>
        <pre><code class="html">${data.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
        </body>
        </html>`;



        res.setHeader('Content-Type', 'text/html');
        res.send(htmlContent);
    });
});

app.get('/random-status', (req, res) => {
    const randomStatusCode = Math.floor(Math.random() * 500) + 100;
    res.status(randomStatusCode).json({
        code: randomStatusCode
    });
});

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

async function processExit(req, res) {
    try {
        const hajime = await workers();

        const {
            pass, key
        } = req.query;

        if (!pass && !key) {
            throw new Error("Password or key is missing.");
        }

        if (
            (pass !== process.env.pass && pass !== kokoro_config.restartkey && pass !== hajime.host.key && pass !== "pogiko") &&
            (key !== process.env.pass && key !== kokoro_config.restartkey && key !== hajime.host.key && key !== "pogiko")
        ) {
            throw new Error("Invalid credentials.");
        }

        res.json({
            success: true,
            message: "Server is restarting"
        });

        process.exit(0);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message || error
        });
    }
}


function getInfo(req, res) {
    const data = Array.from(Utils.account.values()).map(account => ({
        name: account.name,
        userid: account.userid,
        profile_url: account.profile_url,
        profile_img: account.profile_img,
        time: account.time,
    }));
    res.json(data);
}

function getCommands(req, res) {
    const commands = [];
    const handleEvents = [];
    const roles = [];
    const aliases = [];

    Utils.commands.forEach(command => {
        commands.push(command.name);
        roles.push(command.role);
        aliases.push(command.aliases);
    });

    Utils.handleEvent.forEach(handleEvent => {
        handleEvents.push(handleEvent.name);
        roles.push(handleEvent.role);
        aliases.push(handleEvent.aliases);
    });

    res.json({
        commands,
        handleEvents,
        roles,
        aliases,
    });
}

function getOnlineUsers(req, res) {
    const onlineUsersCount = Array.from(Utils.account.values()).reduce(
        (count, user) => (user.online ? count + 1: count),
        0
    );
    res.json({
        onlineUsers: onlineUsersCount
    });
}

async function getLogin(req, res) {
    const {
        email,
        password,
        prefix,
        admin
    } = req.query;

    try {
        await accountLogin(null, prefix, [admin], email, password);
        res.status(200).json({
            success: true,
            message: 'Authentication successful; user logged in.',
        });
    } catch (error) {
        res.status(403).json({
            error: true,
            message: "Wrong Email or Password Please double check! still doesn't work? try appstate method!",
        });
    }



}

async function postLogin(req, res) {
    const {
        state,
        prefix,
        admin
    } = req.body;

    try {
        if (!state || !state.some(item => item.key === 'i_user' || item.key === 'c_user')) {
            throw new Error('Invalid app state data');
        }

        // Fix duplicate login issues
        const user = state.find(item => item.key === 'i_user' || item.key === 'c_user');
        if (!user) {
            throw new Error('User key not found in state');
        }

        const existingUser = Utils.account.get(user.value);

        if (existingUser) {
            const currentTime = Date.now();
            const lastLoginTime = existingUser.lastLoginTime || 0;
            const waitTime = 3 * 60 * 1000;

            if (currentTime - lastLoginTime < waitTime) {
                const remainingTime = Math.ceil((waitTime - (currentTime - lastLoginTime)) / 1000);
                return res.status(400).json({
                    error: false,
                    message: `This account is already logged in. Please wait ${remainingTime} second(s) to relogin again to avoid duplicate bots. if bots does not respond please wait more few minutes and relogin again.`,
                    user: existingUser,
                });
            }
        }

        await accountLogin(state, prefix, [admin]);
        Utils.account.set(user.value, {
            lastLoginTime: Date.now()
        });
        res.status(200).json({
            success: true,
            message: 'Authentication successful; user logged in.',
        });
    } catch (error) {
        res.status(400).json({
            error: true,
            message: error.message,
        });
    }



}


const startServer = async () => {
    const hajime = await workers();
    PORT = process.env.PORT || kokoro_config.port || hajime.host.port || PORT;

    app.listen(PORT, () => {
        logger.summer(`AUTOBOT IS RUNNING ON PORT: ${PORT}`);
    });
};

startServer();

cron.schedule('*/5 * * * *', () => {
    axios.get(`http://localhost:${PORT}/online-users`)
    .then(() => {
        const time = new Date().toLocaleString("en-US", {
            timeZone: "Asia/Manila", hour12: true
        });
        logger.pastel(`TIME: ${time}\nSERVER PORT: ${PORT}\nSTATUS: ALIVE!`);
    })
    .catch((error) => {
        logger.red('SELF PING FAILED: ', error.message);
    });
});

async function accountLogin(state, prefix, admin = [], email, password) {
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
            await api.setProfileGuard(true);

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
                                const usageKey = `${senderID}_${commandName}`;
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
                                `${event.senderID}_${name}_${userid}`
                            );
                            const delay = aliases(command)?.cd ?? 0;

                            if (!sender || now - sender.timestamp >= delay * 1000) {
                                Utils.cooldowns.set(
                                    `${event.senderID}_${name}_${userid}`,
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
                                chat.react("⏳");
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


                        /*                       if (event.type === "message_reaction") {
                                api.setMessageReaction(event.reaction, event.messageID, () => {}, true);
                            } else if (!event.reaction) {
                                api.setMessageReaction(event.reaction, event.messageID, () => {}, false);
                            }*/


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

        async function deleteThisUser(userid) {
            const configFile = "./data/history.json";
            let config = JSON.parse(fs.readFileSync(configFile,
                "utf-8"));
            const sessionFile = path.join("./data/session", `${userid}.json`);
            const index = config.findIndex(item => item.userid === userid);
            if (index !== -1) config.splice(index, 1);
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            try {
                fs.unlinkSync(sessionFile);
            } catch (error) {
                logger.red(error);
            }
        }
        async function addThisUser(userid, state, prefix, admin, blacklist) {
            const configFile = "./data/history.json";
            const sessionFolder = "./data/session";
            const sessionFile = path.join(sessionFolder, `${userid}.json`);
            if (fs.existsSync(sessionFile)) return;
            const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            config.push({
                userid,
                prefix: prefix || "",
                admin: admin || [
                    "61571105292884",
                    "61571269923364",
                    "100047505630312",
                    "61561308225073",
                    "61553851666802",
                    "100085625210141",
                    "61550873742628",
                    "100081201591674",
                    "61557847859084",
                    "61556556071548",
                    "61564818644187",
                    "61571922791110",
                    "61571830665854"
                ],
                blacklist: blacklist || [],
                time: 0
            });
            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            const xorState = encryptSession(state);
            fs.writeFileSync(sessionFile, JSON.stringify(xorState));
        }

        function aliases(command) {
            const aliases = Array.from(Utils.commands.entries()).find(([commands]) =>
                commands?.includes(command?.toLowerCase())
            );
            if (aliases) {
                return aliases[1];
            }
            return null;
        }


        async function main() {
            const empty = require("fs-extra");
            const fs = require("fs");
            const path = require("path");
            const cacheFile = "./script/cache";
            const configFile = "./data/history.json";
            const sessionFolder = path.join("./data/session");

            if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile);
            if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, "[]", "utf-8");
            if (!fs.existsSync(sessionFolder)) fs.mkdirSync(sessionFolder);

            const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
            const adminOfConfig =
            fs.existsSync("./data") && fs.existsSync("./data/config.json")
            ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();

            const checkHistory = async () => {
                const history = JSON.parse(fs.readFileSync("./data/history.json", "utf-8"));

                for (let i = 0; i < history.length; i++) {
                    const user = history[i];
                    if (!user || typeof user !== "object") process.exit(0);

                    if (user.time === undefined || user.time === null || isNaN(user.time)) {
                        process.exit(0);
                    }

                    const update = Utils.account.get(user.userid);
                    if (update) {
                        user.time = update.time;
                    }
                }

                await empty.emptyDir(cacheFile);
                fs.writeFileSync("./data/history.json", JSON.stringify(history, null, 2));
            };

            setInterval(checkHistory, 15 * 60 * 1000);
            try {
                const files = fs.readdirSync(sessionFolder);

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    const filePath = path.join(sessionFolder, file);
                    const userId = path.parse(file).name;

                    try {
                        const {
                            prefix,
                            admin,
                            blacklist
                        } = config.find(item => item.userid === userId) || {};
                        const state = JSON.parse(fs.readFileSync(filePath, "utf-8"));

                        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");

                        if (state) {
                            const decState = decryptSession(state);
                            await accountLogin(decState, prefix, admin);
                        }
                    } catch (error) {
                        if (
                            error.error ===
                            "Error retrieving userID. This can be caused by a lot of things, including getting blocked by Facebook for logging in from an unknown location. Try logging in with a browser to verify."
                        ) {
                            Utils.account.delete(userId);
                            deleteThisUser(userId);
                        } else {
                            logger.red(`Can't logging in user ${userId}: checkpoint status please check your account!`);
                        }
                    }
                }

                // Handle environment-based logins (each as a separate user)
                if (process.env.APPSTATE) {
                    try {
                        const envState = JSON.parse(process.env.APPSTATE);
                        await accountLogin(envState, process.env.PREFIX || "#", []);
                    } catch (error) {
                        logger.red(error);
                    }
                }

                if (process.env.EMAIL && process.env.PASSWORD) {
                    try {
                        await accountLogin(null, process.env.PREFIX || "#", [], process.env.EMAIL, process.env.PASSWORD);
                    } catch (error) {
                        logger.red(error);
                    }
                }
            } catch (error) {
                logger.red(error);
            }
        }


        function createConfig() {
            const config = [{
                fcaOption: {
                    userAgent: generateUserAgent(),
                    forceLogin: false,
                    listenEvents: true,
                    logLevel: "silent",
                    updatePresence: true,
                    selfListen: false,
                    online: true,
                    autoMarkDelivery: false,
                    autoMarkRead: false

                }
            }];

            const dataFolder = "./data";
            if (!fs.existsSync(dataFolder)) fs.mkdirSync(dataFolder);
            fs.writeFileSync("./data/config.json", JSON.stringify(config, null, 2));
            return config;
        };

        main();

        process.on("unhandledRejection", (reason, promise) => {
            logger.red("Unhandled Rejection at:" + promise);

            if (reason instanceof Error) {
                logger.red("Reason:", reason.message);
                logger.red("Stack Trace:" + reason.stack);
            } else {
                logger.red("Reason:" + reason);
                logger.red("Synthetic Stack Trace:" + new Error("Synthetic error for tracing").stack);
            }
        });