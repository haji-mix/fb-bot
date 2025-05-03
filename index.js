const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

// Configuration
global.api = {
  hajime: "https://haji-mix-api.gleeze.com",
  prefix: "#"
};

const {
  logger,
  fonts,
  onChat,
  loadModules,
  getCommands,
  getInfo,
  processExit,
  botHandler,
  minifyHtml,
  obfuscate,
  createStore,
} = require("./system/modules");

const hajime_config = fs.existsSync("./hajime.json")
  ? JSON.parse(fs.readFileSync("./hajime.json", "utf-8"))
  : {};
const admins = Array.isArray(hajime_config?.admins) ? hajime_config.admins : [];
const pkg_config = fs.existsSync("./package.json")
  ? JSON.parse(fs.readFileSync("./package.json", "utf-8"))
  : { description: "", keywords: [], author: "", name: "" };

// Session Store Configuration
const sessionStore = createStore({
  type: 'mongodb',
  uri: 'mongodb+srv://lkpanio25:gwapoko123@cluster0.rdxoaqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  database: 'FB_AUTOBOT',
  collection: 'APPSTATE',
  isOwnHost: false,
  ignoreError: false,
  allowClear: false,
  createConnection: false
});

// Error Patterns
const ERROR_PATTERNS = {
  unsupportedBrowser: /https:\/\/www\.facebook\.com\/unsupportedbrowser/i,
  errorRetrieving: /Error retrieving userID.*unknown location/i,
  connectionRefused: /Connection refused: Server unavailable/i,
  notLoggedIn: /Not logged in\./i
};

// MongoDB Connection
async function connectMongoWithRetry(maxRetries = 3, retryDelay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await sessionStore.start();
      logger.success("Connected to MongoDB for session storage");
      return true;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt === maxRetries) {
        logger.error("Max retries reached. Using file-based sessions only...");
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
}

const isMongoConnected = await connectMongoWithRetry();

// Initialize Utils
const Utils = {
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
  ObjectReply: new Map(),
  limited: new Map(),
  handleReply: [],
  userActivity: { reactedMessages: new Set() },
};

loadModules(Utils, logger);

// Express App Setup
const app = express();
app.set("json spaces", 2);
app.set("view engine", "ejs")
   .set("views", path.join(__dirname, "public", "views"));
app.use(cors({ origin: "*" }))
   .use(helmet({ contentSecurityPolicy: false }))
   .use(express.json())
   .use(express.urlencoded({ extended: false }))
   .use(express.static(path.join(__dirname, "public")));

// Server Utilities
async function getSelfIP() {
  try {
    const response = await axios.get("https://api.ipify.org/?format=json");
    return response.data.ip;
  } catch (error) {
    logger.error("Failed to get self IP:", error.message);
    return null;
  }
}

const blockedIPs = new Map();
const TRUSTED_IPS = ["127.0.0.1", "::1"];
let server, underAttack = false;
let selfIP = null;

getSelfIP().then((ip) => {
  if (ip) {
    selfIP = ip;
    TRUSTED_IPS.push(ip);
    logger.success(`TRUSTED SERVER SELF IP: ${selfIP}`);
  }
});

// Request Handling
const getClientIp = (req) => {
  return (
    req.headers["cf-connecting-ip"] ||
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip
  );
};

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 500,
  handler: (req, res) => {
    const clientIP = getClientIp(req);
    if (!TRUSTED_IPS.includes(clientIP)) {
      blockedIPs.set(clientIP, Date.now());
      switchPort();
      res.redirect("https://" + clientIP);
    }
  },
});

app.use((req, res, next) => {
  const clientIP = getClientIp(req);
  if (blockedIPs.has(clientIP)) {
    switchPort();
    return res.redirect("https://" + clientIP);
  }
  next();
}).use(limiter);

// Server Management
function updateEnvPort(newPort) {
  const envPath = ".env";
  const timestamp = Date.now();
  let envContent = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, "utf8")
    : "";
  envContent = envContent
    .replace(/^PORT=\d+/m, `PORT=${newPort}`)
    .replace(/^PORT_TIMESTAMP=\d+/m, `PORT_TIMESTAMP=${timestamp}`);
  if (!/^PORT=\d+/m.test(envContent)) envContent += `\nPORT=${newPort}`;
  if (!/^PORT_TIMESTAMP=\d+/m.test(envContent))
    envContent += `\nPORT_TIMESTAMP=${timestamp}`;
  fs.writeFileSync(envPath, envContent, "utf8");
}

function switchPort() {
  if (underAttack) return;
  underAttack = true;
  const newPort = Math.floor(Math.random() * (9000 - 4000) + 4000);
  server.close(() => {
    updateEnvPort(newPort);
    startServer(newPort);
    underAttack = false;
  });
}

async function startServer(stealth_port) {
  let PORT = stealth_port || process.env.PORT || hajime_config.port || 10000;
  const lastTimestamp = parseInt(process.env.PORT_TIMESTAMP || 0);
  if (lastTimestamp && Date.now() - lastTimestamp > 3600000) {
    PORT = hajime_config.port || 10000;
  }
  const serverUrl = hajime_config.weblink || `http://localhost:${PORT}`;
  server = app.listen(PORT, () =>
    logger.success(
      `PUBLIC WEB: ${serverUrl}\nLOCAL WEB: http://127.0.0.1:${PORT}`
    )
  );
}

// Session Management
async function validateAppState(state) {
  if (!Array.isArray(state) || state.length === 0) {
    logger.warn("Empty or invalid appstate array");
    return false;
  }
  
  const hasRequiredFields = state.every(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "key" in item &&
      "value" in item
  );
  
  if (!hasRequiredFields) {
    logger.warn("Appstate missing required fields");
    return false;
  }

  const requiredCookies = ["i_user", "c_user", "xs"];
  const hasValidCookies = requiredCookies.every(cookie => 
    state.some(item => item.key === cookie && item.value)
  );
  
  if (!hasValidCookies) {
    logger.warn("Appstate missing required cookies");
    return false;
  }

  return true;
}

async function backupSession(userid, session) {
  try {
    const backupDir = path.join(__dirname, 'session_backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    const backupFile = path.join(backupDir, `${userid}_${Date.now()}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(session, null, 2));
    logger.info(`Backed up session for user ${userid}`);
    return backupFile;
  } catch (error) {
    logger.error(`Failed to backup session for ${userid}: ${error.message}`);
    return null;
  }
}

function isPermanentError(error) {
  if (!error) return false;
  
  const errorStr = typeof error === 'string' ? error : 
                  error.message || JSON.stringify(error);
  
  return Object.values(ERROR_PATTERNS).some(pattern => 
    pattern.test(errorStr)
  );
}

async function loadMongoSession(userid, retryCount = 0, maxRetries = 3) {
  try {
    logger.info(`Loading MongoDB session for user ${userid} (Attempt ${retryCount + 1})`);
    const session = await sessionStore.get(`session_${userid}`);
    const userConfig = await sessionStore.get(`config_${userid}`);

    if (!session || !userConfig) {
      logger.warn(`No session or config found for user ${userid} in MongoDB`);
      return false;
    }

    const isValid = await validateAppState(session);
    if (!isValid) {
      logger.warn(`Invalid app state for user ${userid} in MongoDB`);
      await backupSession(userid, session);
      await deleteThisUser(userid);
      return false;
    }

    if (Utils.account.get(userid)?.online) {
      logger.info(`User ${userid} already logged in, skipping session load`);
      return true;
    }

    try {
      await accountLogin(
        session,
        userConfig?.prefix || "",
        userConfig?.admin ? [userConfig.admin] : admins
      );
      logger.success(`Successfully loaded MongoDB session for user ${userid}`);
      return true;
    } catch (loginError) {
      logger.error(`Login failed for user ${userid}: ${loginError.message}`);
      
      if (isPermanentError(loginError) && retryCount >= maxRetries - 1) {
        logger.warn(`Permanent login issue for user ${userid}, deleting session`);
        await backupSession(userid, session);
        await deleteThisUser(userid);
      }
      
      if (retryCount < maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000;
        logger.info(`Retrying in ${delay/1000}s... (${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return loadMongoSession(userid, retryCount + 1, maxRetries);
      }
      
      return false;
    }
  } catch (error) {
    logger.error(`Failed to load MongoDB session for user ${userid}: ${error.message}`);
    return false;
  }
}

// Account Management
async function accountLogin(state, prefix = "", admin = admins, email, password) {
  const loginOptions = state ? { appState: state } : { email, password };
  if (!loginOptions.appState && !(loginOptions.email && loginOptions.password)) {
    throw new Error("Provide appState or email/password");
  }

  const isExternalState =
    fs.existsSync("./appstate.json") ||
    fs.existsSync("./fbstate.json") ||
    process.env.APPSTATE ||
    (process.env.EMAIL && process.env.PASSWORD);

  return new Promise((resolve, reject) => {
    logger.info(`Initiating login with ${state ? "appState" : "email/password"}`);
    login(loginOptions, async (error, api) => {
      if (error) {
        logger.error(`Login failed: ${error.message}`);
        return reject(error);
      }

      const appState = state || api.getAppState();
      const userid = await api.getCurrentUserID();
      logger.info(`Logged in user ${userid}`);

      const existingSession = await sessionStore.get(`session_${userid}`);
      if (existingSession && JSON.stringify(existingSession) === JSON.stringify(appState)) {
        logger.info(`Session for user ${userid} exists in MongoDB`);
        if (Utils.account.get(userid)?.online) {
          logger.info(`User ${userid} is already online, reusing session`);
          resolve();
          return;
        }
      }

      let admin_uid = null;
      if (Array.isArray(admin) && admin.length > 0) {
        admin_uid = admin[0];
      } else if (typeof admin === "string" && admin) {
        admin_uid = admin;
      } else if (admins.length > 0) {
        admin_uid = admins[0];
      }

      if (admin_uid && /(?:https?:\/\/)?(?:www\.)?facebook\.com/i.test(admin_uid)) {
        try {
          admin_uid = await api.getUID(admin_uid);
        } catch (err) {
          logger.warn(`Failed to resolve Facebook URL: ${admin_uid}, keeping original`);
        }
      }

      if (!isExternalState) {
        await addThisUser(userid, appState, prefix, admin_uid);
      }

      Utils.account.set(userid, {
        name: "ANONYMOUS",
        userid,
        profile_img: `https://graph.facebook.com/${userid}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        profile_url: `https://facebook.com/${userid}`,
        time: 0,
        online: true,
        api,
      });

      setInterval(() => {
        const account = Utils.account.get(userid);
        if (!account) return;
        const newTime = account.time + 1;
        Utils.account.set(userid, { ...account, time: newTime });

        if (newTime % 60 === 0) {
          sessionStore
            .put(`user_${userid}`, {
              ...account,
              time: newTime,
              lastUpdate: Date.now(),
            })
            .catch((err) =>
              logger.error(`Failed to update user time: ${err.message}`)
            );
        }
      }, 1000);

      api.setOptions({
        forceLogin: false,
        listenEvents: true,
        logLevel: "silent",
        updatePresence: true,
        selfListen: false,
        online: true,
        autoMarkDelivery: false,
        autoMarkRead: false,
        userAgent: atob(
          "ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ=="
        ),
      });

      try {
        api.listenMqtt((error, event) => {
          if (error || !"type" in event) {
            logger.warn(`MQTT error for user ${userid}: ${error?.stack || error}`);
            Utils.account.delete(userid);
            if (!isExternalState) deleteThisUser(userid);
            return;
          }
          logger.info(`MQTT event received for user ${userid}: ${event.type}`);
          const chat = new onChat(api, event);
          Object.getOwnPropertyNames(Object.getPrototypeOf(chat))
            .filter(
              (key) => typeof chat[key] === "function" && key !== "constructor"
            )
            .forEach((key) => {
              global[key] = chat[key].bind(chat);
            });
          botHandler({
            fonts,
            chat,
            api,
            Utils,
            logger,
            event,
            aliases,
            admin: admin_uid,
            prefix,
            userid,
          });
        });
        logger.success(`MQTT listener set up for user ${userid}`);
        resolve();
      } catch (error) {
        logger.error(`Failed to set up MQTT listener for user ${userid}: ${error.message}`);
        Utils.account.delete(userid);
        if (!isExternalState) await deleteThisUser(userid);
        reject(error);
      }
    });
  });
}

async function addThisUser(userid, state, prefix, admin) {
  try {
    await sessionStore.put(`session_${userid}`, state);
    await sessionStore.put(`config_${userid}`, {
      userid,
      prefix: prefix || "",
      admin,
      time: 0,
      createdAt: Date.now(),
    });

    const configFile = "./data/history.json";
    const sessionFile = path.join("./data/session", `${userid}.json`);
    if (!fs.existsSync(path.dirname(configFile))) {
      fs.mkdirSync(path.dirname(configFile), { recursive: true });
    }
    if (!fs.existsSync(path.dirname(sessionFile))) {
      fs.mkdirSync(path.dirname(sessionFile), { recursive: true });
    }

    const config = fs.existsSync(configFile)
      ? JSON.parse(fs.readFileSync(configFile, "utf-8")) || []
      : [];
    const existingIndex = config.findIndex((item) => item.userid === userid);
    if (existingIndex !== -1) {
      config[existingIndex] = { userid, prefix: prefix || "", admin, time: 0 };
    } else {
      config.push({ userid, prefix: prefix || "", admin, time: 0 });
    }
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    fs.writeFileSync(sessionFile, JSON.stringify(state));
    logger.info(`Added user ${userid} to session store and file system`);
  } catch (error) {
    logger.error(`Failed to add user ${userid}: ${error.message}`);
  }
}

async function deleteThisUser(userid) {
  try {
    await sessionStore.remove(`session_${userid}`);
    await sessionStore.remove(`config_${userid}`);
    await sessionStore.remove(`user_${userid}`);

    const configFile = "./data/history.json";
    const sessionFile = path.join("./data/session", `${userid}.json`);
    const config = fs.existsSync(configFile)
      ? JSON.parse(fs.readFileSync(configFile, "utf-8")) || []
      : [];
    const index = config.findIndex((item) => item.userid === userid);
    if (index !== -1) config.splice(index, 1);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
    if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
    logger.info(`Deleted user ${userid} from session store and file system`);
  } catch (error) {
    logger.error(`Failed to delete user ${userid}: ${error.message}`);
  }
}

// Main Application
async function main() {
  try {
    // Load sessions from MongoDB first
    if (isMongoConnected) {
      logger.info("Loading sessions from MongoDB...");
      const sessions = await sessionStore.entries();
      const mongoUserIds = new Set();

      for (const { key } of sessions) {
        if (key.startsWith("session_")) {
          const userid = key.replace("session_", "");
          mongoUserIds.add(userid);
        }
      }

      for (const userid of mongoUserIds) {
        await loadMongoSession(userid);
      }
      logger.success(`Loaded ${mongoUserIds.size} sessions from MongoDB`);
    }

    // Fallback to file-based sessions
    const sessionFolder = path.join("./data/session");
    const configFile = "./data/history.json";

    if (!fs.existsSync(sessionFolder)) {
      fs.mkdirSync(sessionFolder, { recursive: true });
    }

    if (!fs.existsSync(configFile)) {
      fs.writeFileSync(configFile, "[]", "utf-8");
    }

    const config = fs.existsSync(configFile)
      ? JSON.parse(fs.readFileSync(configFile, "utf-8")) || []
      : [];

    const files = fs.existsSync(sessionFolder)
      ? fs.readdirSync(sessionFolder).filter((file) => file.endsWith(".json"))
      : [];

    for (const file of files) {
      const userId = path.parse(file).name;
      if (Utils.account.get(userId)?.online) continue;

      const userConfig = config.find((item) => item.userid === userId) || {};
      const filePath = path.join(sessionFolder, file);

      try {
        if (!fs.existsSync(filePath)) continue;

        const session = JSON.parse(fs.readFileSync(filePath, "utf-8"));
        if (!await validateAppState(session)) continue;

        // Only migrate to MongoDB if connected
        if (isMongoConnected) {
          const existing = await sessionStore.get(`session_${userId}`);
          if (!existing) {
            await sessionStore.put(`session_${userId}`, session);
            await sessionStore.put(`config_${userId}`, {
              userid: userId,
              prefix: userConfig?.prefix || "",
              admin: userConfig?.admin,
              time: userConfig?.time || 0,
              migratedAt: Date.now(),
            });
            logger.info(`Migrated session for ${userId} to MongoDB`);
          }
        }

        await accountLogin(
          session,
          userConfig.prefix || "",
          userConfig.admin ? [userConfig.admin] : admins
        );
      } catch (error) {
        logger.error(`Error handling session file ${file}: ${error.message}`);
      }
    }

    // Handle environment-based logins
    if (process.env.APPSTATE) {
      try {
        const envState = JSON.parse(process.env.APPSTATE);
        if (await validateAppState(envState)) {
          await accountLogin(
            envState,
            process.env.PREFIX || global.api.prefix,
            admins
          );
        }
      } catch (error) {
        logger.error(`Failed to login with APPSTATE: ${error.stack || error}`);
      }
    }

    if (process.env.EMAIL && process.env.PASSWORD) {
      try {
        await accountLogin(
          null,
          process.env.PREFIX || global.api.prefix,
          admins,
          process.env.EMAIL,
          process.env.PASSWORD
        );
      } catch (error) {
        logger.error(`Failed to login with EMAIL/PASSWORD: ${error.stack || error}`);
      }
    }

    // Setup periodic session validation
    if (isMongoConnected) {
      setInterval(async () => {
        try {
          logger.info("Running periodic session validation...");
          const sessions = await sessionStore.entries();
          
          for (const { key, value } of sessions) {
            if (key.startsWith("session_")) {
              const userid = key.replace("session_", "");
              if (!await validateAppState(value)) {
                logger.warn(`Invalid session detected for ${userid}`);
                await backupSession(userid, value);
                await deleteThisUser(userid);
              }
            }
          }
        } catch (error) {
          logger.error(`Periodic validation error: ${error.message}`);
        }
      }, 3600000); // Run every hour
    }
  } catch (error) {
    logger.error(`Failed in main execution: ${error.message}`);
  }
}

// Start the application
main().catch(err => {
  logger.error("Fatal error in main:", err);
});

// Start the server
startServer();

process.on("unhandledRejection", (reason) => {
  logger.error(
    reason instanceof Error
      ? `${reason.name}: ${reason.message}\n${reason.stack}`
      : JSON.stringify(reason)
  );
});