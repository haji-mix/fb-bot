const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const express = require("express");
const rateLimit = require('express-rate-limit');
const app = express();
const axios = require("axios");
const helmet = require('helmet');
const cors = require('cors');

require('dotenv').config();

const {
    workers,
    logger,
    fonts,
    OnChat,
    loadModules,
    download,
    encryptSession,
    decryptSession,
    generateUserAgent,
    getCommands,
    getInfo,
    processExit
} = require("./system/modules");

const config = fs.existsSync("./data/config.json") ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")): createConfig();
let kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));
let pkg_config = JSON.parse(fs.readFileSync('./package.json', 'utf-8'));

const Utils = {
    commands: new Map(),
    handleEvent: new Map(),
    account: new Map(),
    cooldowns: new Map(),
    ObjectReply: new Map(),
    limited: new Map(),
    handleReply: [],
    userActivity: {
        reactedMessages: new Set()
    }
};

loadModules(Utils, logger);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'public', 'views'));

const blockedIPs = new Map();
const TRUSTED_IPS = ['127.0.0.1'];
let server;
let underAttack = false;

const isBlocked = (ip) => blockedIPs.has(ip);

const startServer = async (stealth_port) => {
    try {
        const hajime = await workers();

        // Reload environment variables
        require('dotenv').config();

        let PORT = stealth_port || process.env.PORT || kokoro_config.port || hajime?.host?.port || 10000;
        const lastTimestamp = process.env.PORT_TIMESTAMP ? parseInt(process.env.PORT_TIMESTAMP) : 0;
        const currentTime = Date.now();

        // Check if more than 1 hour has passed
        if (lastTimestamp && currentTime - lastTimestamp > 60 * 60 * 1000) {
            console.log("More than 1 hour passed, removing stored port.");
            removeEnvPort();
            PORT = kokoro_config.port || hajime?.host?.port || 10000; // Fallback to default
        }

        const serverUrl =
            (kokoro_config.weblink && kokoro_config.port ? `${kokoro_config.weblink}:${kokoro_config.port}` : null) ||
            kokoro_config.weblink ||
            (hajime?.host?.server?.[0] && hajime?.host?.port ? `${hajime.host.server[0]}:${hajime.host.port}` : null) ||
            hajime?.host?.server?.[0] ||
            `http://localhost:${PORT}`;

        server = app.listen(PORT, () => {
            logger.instagram(`PUBLIC WEB: ${serverUrl}\nLOCAL WEB: http://127.0.0.1:${PORT}`);
        });

    } catch (error) {
        console.error("Error starting server:", error);
    }
};


function updateEnvPort(newPort) {
    const envPath = ".env";
    if (!fs.existsSync(envPath)) {
        fs.writeFileSync(envPath, "", "utf8");
    }

    let envContent = fs.readFileSync(envPath, "utf8");

    const timestamp = Date.now(); // Store current timestamp

    // Replace or add PORT and TIMESTAMP
    envContent = envContent.replace(/^PORT=\d+/m, `PORT=${newPort}`);
    envContent = envContent.replace(/^PORT_TIMESTAMP=\d+/m, `PORT_TIMESTAMP=${timestamp}`);

    if (!/^PORT=\d+/m.test(envContent)) envContent += `\nPORT=${newPort}`;
    if (!/^PORT_TIMESTAMP=\d+/m.test(envContent)) envContent += `\nPORT_TIMESTAMP=${timestamp}`;

    fs.writeFileSync(envPath, envContent, "utf8");
    console.log(`Updated .env with PORT=${newPort}, TIMESTAMP=${timestamp}`);
}


function removeEnvPort() {
    const envPath = ".env";
    if (!fs.existsSync(envPath)) return;

    let envContent = fs.readFileSync(envPath, "utf8");

    // Remove PORT and PORT_TIMESTAMP
    envContent = envContent.replace(/^PORT=\d+\n?/m, "");
    envContent = envContent.replace(/^PORT_TIMESTAMP=\d+\n?/m, "");

    fs.writeFileSync(envPath, envContent, "utf8");
    console.log("Removed stored PORT and TIMESTAMP from .env");
}

function switchPort() {
    if (underAttack) return;
    underAttack = true;

    const newPort = Math.floor(Math.random() * (9000 - 4000) + 4000);
    console.log(`Switching to port ${newPort}`);

    if (server) {
        server.close(() => {
            console.log(`Closed old port`);
            updateEnvPort(newPort);
            startServer(newPort);
            underAttack = false;
        });
    }
}


app.use((req, res, next) => {
    const clientIP = req.headers["cf-connecting-ip"] || req.ip;
    if (isBlocked(clientIP)) {
        switchPort();
        return res.redirect("https://chatgpt.com/");
    }
    next();
});

const limiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        const clientIP = req.headers["cf-connecting-ip"] || req.ip;
        
        if (!TRUSTED_IPS.includes(clientIP)) {
            console.log(`DDoS detected from ${clientIP}! Blocking IP and switching ports...`);
            blockedIPs.set(clientIP, Date.now());
            switchPort();
            return res.redirect("https://chatgpt.com/");
        }
    },
});

app.use(cors({
    origin: "*"
}));

app.use(helmet({
    contentSecurityPolicy: false
}));

app.use((req, res, next) => {
    res.setHeader('x-powered-by', 'Kokoro AI');
    next();
});


app.use(limiter); // Apply rate limiting globally

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());



const routes = [{
    path: '/',
    file: 'index.ejs',
    method: 'get'
},
    {
        path: '/jseditor',
        file: 'ide.ejs',
        method: 'get'
    },
    {
        path: '/info',
        method: 'get',
        handler: (req,
            res) => getInfo(req,
            res,
            Utils)
    },
    {
        path: '/commands',
        method: 'get',
        handler: (req,
            res) => getCommands(req,
            res,
            Utils)
    },
    {
        path: '/login',
        method: 'post',
        handler: postLogin
    },
    {
        path: '/restart',
        method: 'get',
        handler: (req,
            res) => processExit(req,
            res)
    },
    {
        path: '/login_cred',
        method: 'get',
        handler: getLogin
    }];


// Destructure values from pkg_config
const {
    description, keywords, author, name
} = pkg_config;
const cssFiles = getFilesFromDir('public/framework/css', '.css').map(file => `./framework/css/${file}`);
const scriptFiles = getFilesFromDir('public/views/extra/js', '.js').map(file => `./views/extra/js/${file}`);
const styleFiles = getFilesFromDir('public/views/extra/css', '.css').map(file => `./views/extra/css/${file}`);
const jsFiles = getFilesFromDir('public/framework/js', '.js').map(file => `./framework/js/${file}`);

const {
    minify
} = require('html-minifier');
const {
    obfuscate
} = require('html-obfuscator');


const minifyConfig = {
    caseSensitive: false,
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    collapseInlineTagWhitespace: false,
    conservativeCollapse: false,
    decodeEntities: true,
    html5: true,
    includeAutoGeneratedTags: false,
    keepClosingSlash: false,
    maxLineLength: 0,
    minifyCSS: true,
    minifyJS: true,
    minifyURLs: true,
    preserveLineBreaks: false,
    preventAttributesEscaping: false,
    processConditionalComments: true,
    processScripts: 'text/html',
    quoteCharacter: '"',
    removeAttributeQuotes: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeEmptyElements: false,
    removeOptionalTags: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    removeTagWhitespace: true,
    sortAttributes: true,
    sortClassName: true,
    trimCustomFragments: true,
    useShortDoctype: true
};

function minifyHtml(renderedHtml, mconfig = minifyConfig) {
    return minify(renderedHtml,
        mconfig);
}

const sitekey = process.env.sitekey || kokoro_config.sitekey;

routes.forEach(route => {
    if (route.file) {
        app[route.method](route.path, (req, res) => {
            res.render(route.file, {
                cssFiles, scriptFiles, jsFiles, description, keywords, name, styleFiles, author, sitekey
            }, (err, renderedHtml) => {
                if (err) {
                    res.status(500).send('Error rendering template');
                    return;
                }

                res.send(obfuscate(minifyHtml(renderedHtml)));
            });
        });
    } else if (route.handler) {
        app[route.method](route.path, route.handler);
    }
});

    const scriptsPath = path.join(__dirname, 'script', 'restapi');

    if (!fs.existsSync(scriptsPath)) {
      console.error(`Directory not found: ${scriptsPath}`);
      return;
    }

    fs.readdirSync(scriptsPath).forEach(file => {
        const script = require(path.join(scriptsPath, file));

        if (script.config && script.config.name) {
          app.get(`/api/v2/${script.config.name}`, (req, res) => {
              script.initialize({ req, res });
          });

          if (script.config.aliases && script.config.aliases.length > 0) {
            script.config.aliases.forEach(alias => {
              app.get(`/api/v2/${alias}`, (req, res) => {
                  script.initialize({ req, res, hajime });
              });
            });
          }
        }
    });


app.get('/script/*', (req, res) => {
    const filePath = path.join(__dirname, 'script', req.params[0] || '');
    const normalizedPath = path.normalize(filePath);

    if (!normalizedPath.startsWith(path.join(__dirname, 'script'))) {
        return res.status(403).render('403', { cssFiles, jsFiles });
    }

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(404).render('404',
        {
            cssFiles,
            jsFiles
        },
        (err,
            renderedHtml) => {
            if (err) {
                res.status(500).send('Error rendering template');
                return;
            }

            res.send(minifyHtml(renderedHtml));
        });
        }

        if (req.query.raw === 'true') {
            return res.type('text/plain').send(data);
        }

        res.render('snippet', {
            title: req.params[0],
            code: data
        })
    });
});


app.use((req, res) => {
    res.status(404).render('404',
        {
            cssFiles,
            jsFiles
        },
        (err,
            renderedHtml) => {
            if (err) {
                res.status(500).send('Error rendering template');
                return;
            }

            res.send(minifyHtml(renderedHtml));
        });
});



function getFilesFromDir(directory, fileExtension) {
    const dirPath = path.join(__dirname, directory);
    if (!fs.existsSync(dirPath)) return [];
    return fs.readdirSync(dirPath).filter(file => file.endsWith(fileExtension));
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
            message: error.message || "Wrong Email or Password Please double check! still doesn't work? try appstate method!",
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
                    duration: remainingTime,
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
            message: error.message || "Invalid Appstate!",
        });
    }
}

function changePort() {
    server.close(() => {
        const stealth_port = Math.floor(Math.random() * (60000 - 4000) + 4000); // Random port
        startServer(stealth_port);
    });
}

startServer();

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

            const refresh_c3c = await api.getAppState();


            let appState = refresh_c3c || state;

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
            } catch (error) {
                reject(error);
                return;
            }

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
                listenEvents, logLevel, updatePresence, selfListen, forceLogin, online, autoMarkDelivery, autoMarkRead 
               } = config[0].fcaOption;

            api.setOptions({
                listenEvents,
                logLevel,
                updatePresence,
                selfListen,
                forceLogin,
                userAgent: atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ=="),
                online,
                autoMarkDelivery,
                autoMarkRead
            });

            try {
                var listenEmitter = api.listenMqtt(async (error, event) => {
                    if (!event) return;
                    if (error) {
                        if (error === 'Connection closed.') {
                            logger.yellow(`Error during API listen: ${error}`, userid);
                        }
                        console.error(error.stack)
                    }

                    const chat = new OnChat(api, event);
                    kokoro_config = JSON.parse(fs.readFileSync('./kokoro.json', 'utf-8'));
                    chat.testCo(kokoro_config.author, 2);

if (event && event.senderID && event?.body) {
    const isGroup = event.isGroup || event.threadID !== event.senderID;
    const idType = isGroup ? "GroupID" : "Private Chat";
    const idValue = isGroup ? event.threadID : event.senderID;

    let logMessage = `${idType}: ${idValue}\nSenderID: ${event.senderID}\nMessage: ${(event?.body || "").trim()}`;

    logger.instagram(fonts.origin(logMessage));
}

                    const reply = async (msg) => {
                        const msgInfo = await chat.reply(fonts.thin(msg));
                        msgInfo.unsend(15000);
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

                        // Add the new message
                        Utils.userActivity[userId].messages.push({
                            message,
                            timestamp: currentTime
                        });

                        // Check for spam
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
                    ? "": prefix;

                    let [command,
                        ...args] = (event?.body || "")
                    .trim()
                    .toLowerCase()
                    .startsWith(isPrefix?.toLowerCase())
                    ? (event?.body || "")
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

                        const bot_owner = (Array.isArray(admin) && admin.includes(event.senderID)) || super_admin;


                        const threadInfo = await chat.threadInfo(event.threadID);

                        const adminIDs = (threadInfo?.adminIDs || []).map(admin => admin.id);

                        const group_admin = adminIDs.includes(event.senderID) || bot_owner || super_admin;

                        const excludes_mod = super_admin || bot_owner;

                        if (kokoro_config?.blacklist.includes(event.senderID)) {
                            return;
                        }

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
                                await reply(`Limit Reached: This command is available up to ${aliases(command)?.limit} times per 25 minutes for standard users. To access unlimited usage, please upgrade to our Premium version. For more information, contact us directly or use callad!`);
                                return;
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
            await reply(`Please wait ${active} second(s) before using the "${name}" command again.`);
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
                        await reply(
                            `Invalid command please use help to see the list of available commands.`
                        );
                        return;
                    }

                    if (event && event?.body &&
                        command &&
                        prefix &&
                        event?.body
                        ?.toLowerCase()
                        .startsWith(prefix?.toLowerCase()) &&
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

                                                        Utils,
                                                    });
                                                }
                                            }
                                            break;
                                }
                        });
                } catch (error) {
                    console.error(error.stack);
                    Utils.account.delete(userid);
                    deleteThisUser(userid);

                    return;
                }

                    resolve();
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
                console.error(error.stack);
            }
        }
        async function addThisUser(userid, state, prefix, admin) {
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
    try {
        let history = JSON.parse(fs.readFileSync("./data/history.json", "utf-8"));

        history = history.filter(user => {
            if (!user || typeof user !== "object") return false; // Remove non-objects
            if (user.time === undefined || user.time === null || isNaN(user.time)) return false; 
            return true;
        });

        for (let user of history) {
            const update = Utils.account.get(user.userid);
            if (update) {
                user.time = update.time;
            }
        }

        await empty.emptyDir(cacheFile);

        fs.writeFileSync("./data/history.json", JSON.stringify(history, null, 2));
    } catch (error) {
        console.error("Error checking history:", error.stack);
    }
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
                            admin
                        } = config.find(item => item.userid === userId) || {};
                        const state = JSON.parse(fs.readFileSync(filePath, "utf-8"));

                        fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");

                        if (state) {
                            const decState = decryptSession(state);
                            await accountLogin(decState, prefix, admin);
                        }
                    } catch (error) {
    const ERROR_PATTERNS = {
        unsupportedBrowser: /https:\/\/www\.facebook\.com\/unsupportedbrowser/,
        errorRetrieving: /Error retrieving userID.*unknown location/
    };

    const ERROR = error.message || error.error || error.Error;

    if (ERROR_PATTERNS.errorRetrieving.test(ERROR)) {
        logger.yellow(`Detected login issue for user ${userId}. Deleting account.`);
        Utils.account.delete(userId);
        deleteThisUser(userId);
    } else if (ERROR_PATTERNS.unsupportedBrowser.test(ERROR)) {
        logger.yellow(`Detected login browser issue for user ${userId}. Deleting account.`);
        Utils.account.delete(userId);
        deleteThisUser(userId);
    } else {
        console.error(`Can't log in user ${userId}: checkpoint status, please check your account!`, error.stack);
    }
}
                }

                // Handle environment-based logins (each as a separate user)
                if (process.env.APPSTATE) {
                    try {
                        const envState = JSON.parse(process.env.APPSTATE);
                        await accountLogin(envState, process.env.PREFIX || "#", []);
                    } catch (error) {
                        console.error(error.stack);
                    }
                }

                if (process.env.EMAIL && process.env.PASSWORD) {
                    try {
                        await accountLogin(null, process.env.PREFIX || "#", [], process.env.EMAIL, process.env.PASSWORD);
                    } catch (error) {
                        console.error(error.stack);
                    }
                }
            } catch (error) {
                console.error(error.stack);
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
            console.error(reason.message || reason.stack)
        });