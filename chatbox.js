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
    processExit,
    botHandler,
    minifyHtml, obfuscate
} = require("./system/modules");

const config = fs.existsSync("./data/config.json") ? JSON.parse(fs.readFileSync("./data/config.json", "utf8")) : createConfig();
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
        return res.redirect("https://google.com/");
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
            return res.redirect("https://google.com/");
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
    res.setHeader('x-powered-by', 'Haji Mix');
    next();
});


app.use(limiter);

app.set("json spaces", 2);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use(express.static(path.join(__dirname, 'public')));


app.get('/projects', (req, res) => {
    res.sendFile(path.join(__dirname, 'projects.json'));
});

app.get('/skills', (req, res) => {
    res.sendFile(path.join(__dirname, 'skills.json'));
});

const routes = [{
    path: '/create',
    file: 'index.ejs',
    method: 'get'
},
{
    path: '/jseditor',
    file: 'ide.ejs',
    method: 'get'
},
{
    path: '/',
    file: 'me.ejs',
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

async function accountLogin(state, prefix = "", admin = [], email, password) {
    const global = await workers();

    return new Promise((resolve, reject) => {
        const loginOptions = state
            ? {
                appState: state
            } : email && password
                ? {
                    email: email, password: password
                } : null;

        if (!loginOptions) {
            reject(new Error('Either appState or email/password must be provided.'));
            return;
        }

        login(loginOptions, async (error, api) => {
            if (error) {
                reject(error);
                return;
            }

            // const refresh_c3c = await api.getAppState();


            let appState = /*refresh_c3c ||*/ state;

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
            addThisUser(userid, appState, prefix, admin_uid);
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
                logger,
                api,
                fonts,
                font: fonts
            });

            const notevent = require('./system/notevent')({
                logger,
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
                    
                    if (!api || !event) return;

                    
                    if (error) {
                        console.warn(error.stack);
                        process.exit(0);
                    }
                    
                    let chat = new OnChat(api, event);
                    
                    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(chat))) {
    if (typeof chat[key] === 'function' && key !== 'constructor') {
        global[key] = (...args) => chat[key](...args);
    }
}
                
                    botHandler({ fonts, chat, api, Utils, logger, event, aliases, admin, global, prefix, userid });
                                  
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
        logger.red(error.stack);
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
        admin,
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
            ? JSON.parse(fs.readFileSync("./data/config.json", "utf8"))
            : createConfig();

    const executeTask = async () => {
        try {
            const history = JSON.parse(fs.readFileSync('./data/history.json', 'utf-8'));
            history.forEach(user => {
                if (!user && !user.userid) return;
                const update = Utils.account.get(user.userid);
                if (update) user.time = update.time;
            });
            await empty.emptyDir(cacheFile);
            await fs.writeFileSync('./data/history.json', JSON.stringify(history, null, 2));
        } catch (error) {
            logger.red('Error executing task:' + error.stack);
        }
    };

    setInterval(executeTask, 60000);

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
        errorRetrieving: /Error retrieving userID.*unknown location/,
        connectionRefused: /Connection refused: Server unavailable/,
        notLoggedIn: /Not logged in\./
    };

    const ERROR = error?.message || error?.error;

    let errorHandled = false;

    for (const [errorType, pattern] of Object.entries(ERROR_PATTERNS)) {
        if (pattern.test(ERROR)) {
            switch (errorType) {
                case 'connectionRefused':
                case 'notLoggedIn':
                    logger.yellow(`Can't log in user ${userId}: checkpoint status, please check your account make sure appstate still valid!`);
                    break;
                case 'errorRetrieving':
                    logger.yellow(`Detected login issue for user ${userId}.`);
                    break;
                case 'unsupportedBrowser':
                    logger.yellow(`Detected login browser issue for user ${userId}. Deleting account.`);
                    break;
                default:
                    logger.red(`Can't log in user ${userId}: Something went wrong!: ` + error.stack);
                    break;
            }

            Utils.account.delete(userId);
            deleteThisUser(userId);
            errorHandled = true;
            break;
        }
    }

    if (!errorHandled) {
        logger.red(`Can't log in user ${userId}: Something went wrong!: ` + error.stack);
    }
}
        }

        if (process.env.APPSTATE) {
            try {
                const envState = JSON.parse(process.env.APPSTATE);
                await accountLogin(envState, process.env.PREFIX || "#", []);
            } catch (error) {
                logger.red(error.stack);
            }
        }

        if (process.env.EMAIL && process.env.PASSWORD) {
            try {
                await accountLogin(null, process.env.PREFIX || "#", [], process.env.EMAIL, process.env.PASSWORD);
            } catch (error) {
                logger.red(error.stack);
            }
        }
    } catch (error) {
        logger.red(error.stack);
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
    console.error(reason.stack)
});