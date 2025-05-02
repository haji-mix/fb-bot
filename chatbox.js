const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
const login = require("./chatbox-fca-remake/package/index");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

global.api = {
  hajime: "https://hajiMix-api.gleeze.com",
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
  MongoStore,
} = require("./system/modules");

const hajime_config = process.env.HAJIME_CONFIG ? JSON.parse(process.env.HAJIME_CONFIG) : {};
const admins = Array.isArray(hajime_config?.admins) ? hajime_config.admins : [];
const pkg_config = process.env.PKG_CONFIG ? JSON.parse(process.env.PKG_CONFIG) : { description: "", keywords: [], author: "", name: "" };

const MONGO_URI = process.env.MONGO_URI || hajime_config.mongo_uri || "mongodb+srv://lkpanio25:gwapoko123@cluster0.rdxoaqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const sessionStore = new MongoStore({
  uri: MONGO_URI,
  collection: "sessions",
  ignoreError: true,
  allowClear: false,
});

// Track active MQTT listeners and login status
const activeListeners = new Map();
const loginLocks = new Map();

async function connectMongo() {
  try {
    await sessionStore.start();
    logger.success("Connected to MongoDB for session storage");
  } catch (error) {
    logger.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

connectMongo();

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

const app = express();
app.set("json spaces", 2);
app.set("view engine", "ejs")
   .set("views", path.join(__dirname, "public", "views"))
   .use(cors({ origin: "*" }))
   .use(helmet({ contentSecurityPolicy: false }))
   .use(express.json())
   .use(express.urlencoded({ extended: false }))
   .use(express.static(path.join(__dirname, "public")));

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

function updateEnvPort(newPort) {
  process.env.PORT = newPort;
  process.env.PORT_TIMESTAMP = Date.now().toString();
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

const { description = "", keywords = [], author = "", name = "" } = pkg_config;
const sitekey = process.env.sitekey || hajime_config.sitekey || "";
const cssFiles = ["framework/css/style1.css", "framework/css/style2.css"];
const scriptFiles = ["views/extra/js/script1.js"];
const styleFiles = ["views/extra/css/extra.css"];
const jsFiles = ["framework/js/main.js"];

const routes = [
  { path: "/", file: "index.ejs", method: "get" },
  { path: "/jseditor", file: "ide.ejs", method: "get" },
  { path: "/info", method: "get", handler: (req, res) => getInfo(req, res, Utils) },
  { path: "/commands", method: "get", handler: (req, res) => getCommands(req, res, Utils) },
  { path: "/login", method: "post", handler: postLogin },
  { path: "/restart", method: "get", handler: (req, res) => processExit(req, res) },
  { path: "/login_cred", method: "get", handler: getLogin },
];

routes.forEach((route) => {
  if (route.file) {
    app[route.method](route.path, (req, res) =>
      res.render(
        route.file,
        { cssFiles, scriptFiles, jsFiles, description, keywords, name, styleFiles, author, sitekey },
        (err, html) =>
          err ? res.status(500).send("Error rendering template") : res.send(obfuscate(minifyHtml(html)))
      )
    );
  } else if (route.handler) {
    app[route.method](route.path, route.handler);
  }
});

app.get("/script/*", (req, res) => {
  res.status(404).render("404", { cssFiles, jsFiles }, (err, html) => {
    res.send(err ? "Error rendering template" : minifyHtml(html));
  });
});

app.use((req, res) =>
  res.status(404).render("404", { cssFiles, jsFiles }, (err, html) => {
    res.send(err ? "Error rendering template" : minifyHtml(html));
  })
);

async function getLogin(req, res) {
  const { email, password, prefix = "", admin } = req.query;
  try {
    await accountLogin(null, prefix, admin ? [admin] : admins, email, password, false);
    res.status(200).json({ success: true, message: "Authentication successful" });
  } catch (error) {
    logger.error(`Login failed for email/password: ${error.message}`);
    res.status(403).json({ error: true, message: error.message || "Invalid credentials" });
  }
}

async function postLogin(req, res) {
  const { state, prefix = "", admin } = req.body;
  try {
    if (!state || !state.some((item) => ["i_user", "c_user"].includes(item.key))) {
      throw new Error("Invalid app state data");
    }
    const user = state.find((item) => ["i_user", "c_user"].includes(item.key));
    const userId = user.value;

    if (loginLocks.has(userId)) {
      return res.status(429).json({
        error: true,
        message: "Login in progress, please wait.",
      });
    }

    loginLocks.set(userId, true);
    try {
      await cleanupUserSession(userId, true);
      await accountLogin(state, prefix, admin ? [admin] : admins, null, null, true);
      await sessionStore.put(`user_${userId}`, {
        lastLoginTime: Date.now(),
        userId,
      });
      res.status(200).json({ success: true, message: "Authentication successful" });
    } finally {
      loginLocks.delete(userId);
    }
  } catch (error) {
    loginLocks.delete(user?.value);
    logger.error(`Post login failed: ${error.message}`);
    res.status(400).json({ error: true, message: error.message || "Invalid app state" });
  }
}

async function cleanupUserSession(userid, saveToMongo = false) {
  logger.info(`Cleaning up session for user ${userid}`);
  if (activeListeners.has(userid)) {
    try {
      await activeListeners.get(userid).stop();
      logger.info(`MQTT listener stopped for user ${userid}`);
    } catch (error) {
      logger.error(`Failed to stop MQTT listener for user ${userid}: ${error.message}`);
    }
    activeListeners.delete(userid);
  }
  Utils.account.delete(userid);
  if (saveToMongo) {
    await sessionStore.remove(`session_${userid}`);
    await sessionStore.remove(`config_${userid}`);
    await sessionStore.remove(`user_${userid}`);
  }
}

async function accountLogin(state, prefix = "", admin = admins, email, password, saveToMongo = false) {
  const loginOptions = state ? { appState: state } : { email, password };
  if (!loginOptions.appState && !(loginOptions.email && loginOptions.password)) {
    throw new Error("Provide appState or email/password");
  }

  return new Promise((resolve, reject) => {
    logger.success(`Initiating login with ${state ? "appState" : "email/password"}`);
    login(loginOptions, async (error, api) => {
      if (error) {
        logger.error(`Login failed: ${error.message}`);
        return reject(error);
      }

      const appState = state || api.getAppState();
      const userid = await api.getCurrentUserID();

      if (loginLocks.has(userid)) {
        logger.warn(`Concurrent login detected for user ${userid}`);
        return reject(new Error("Concurrent login attempt detected"));
      }
      loginLocks.set(userid, true);

      try {
        await cleanupUserSession(userid, saveToMongo);

        if (saveToMongo) {
          await sessionStore.put(`session_${userid}`, appState);
          await sessionStore.put(`config_${userid}`, {
            userid,
            prefix: prefix || "",
            admin: admin[0] || admins[0],
          });
        }

        let admin_uid = admin[0] || admins[0];
        if (admin_uid && /(?:https?:\/\/)?(?:www\.)?facebook\.com/i.test(admin_uid)) {
          try {
            admin_uid = await api.getUID(admin_uid);
          } catch (err) {
            logger.warn(`Failed to resolve Facebook URL: ${admin_uid}`);
          }
        }

        Utils.account.set(userid, {
          name: "ANONYMOUS",
          userid,
          profile_img: `https://graph.facebook.com/${userid}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
          profile_url: `https://facebook.com/${userid}`,
          online: true,
          api,
        });

        api.setOptions({
          forceLogin: false,
          listenEvents: true,
          logLevel: "silent",
          updatePresence: true,
          selfListen: false,
          online: true,
          autoMarkDelivery: false,
          autoMarkRead: false,
          userAgent: atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhpKQ=="),
        });

        const listener = api.listenMqtt((error, event) => {
          if (error || !"type" in event) {
            logger.warn(`MQTT error for user ${userid}: ${error?.stack || error}`);
            cleanupUserSession(userid, saveToMongo);
            return;
          }
          logger.success(`MQTT event received for user ${userid}: ${event.type}`);
          const chat = new onChat(api, event);
          Object.getOwnPropertyNames(Object.getPrototypeOf(chat))
            .filter((key) => typeof chat[key] === "function" && key !== "constructor")
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
        activeListeners.set(userid, listener);
        logger.success(`MQTT listener set up for user ${userid}. Total listeners: ${activeListeners.size}`);
        resolve();
      } catch (error) {
        logger.error(`Failed to set up user ${userid}: ${error.message}`);
        await cleanupUserSession(userid, saveToMongo);
        reject(error);
      } finally {
        loginLocks.delete(userid);
      }
    });
  });
}

function aliases(command) {
  const entry = Array.from(Utils.commands.entries()).find(([commands]) =>
    commands?.includes(command?.toLowerCase())
  );
  return entry ? entry[1] : null;
}

async function main() {
  const validateAppState = (state) => {
    if (!Array.isArray(state) || state.length === 0) {
      return false;
    }
    return state.every(
      (item) => typeof item === "object" && item !== null && "key" in item && "value" in item
    );
  };

  try {
    logger.success("Loading sessions from MongoDB...");
    const sessions = await sessionStore.entries();
    const userIds = [];

    for (const { key } of sessions) {
      if (key.startsWith("session_")) {
        userIds.push(key.replace("session_", ""));
      }
    }

    for (const userid of userIds) {
      try {
        const session = await sessionStore.get(`session_${userid}`);
        const userConfig = await sessionStore.get(`config_${userid}`);

        if (!session || !userConfig || !validateAppState(session)) {
          logger.warn(`Invalid or missing session for user ${userid}`);
          await cleanupUserSession(userid, true);
          continue;
        }

        if (Utils.account.get(userid)?.online && activeListeners.has(userid)) {
          logger.success(`User ${userid} already logged in`);
          continue;
        }

        await cleanupUserSession(userid, false);
        await accountLogin(
          session,
          userConfig?.prefix || "",
          userConfig?.admin ? [userConfig.admin] : admins,
          null,
          null,
          true
        );
        logger.success(`Loaded session for user ${userid}`);
      } catch (error) {
        logger.error(`Failed to load session for user ${userid}: ${error.message}`);
      }
    }

    logger.success(`Loaded ${userIds.length} sessions from MongoDB`);

    let c3c_json = null;
    for (const file of ["./appstate.json", "./fbstate.json"]) {
      if (fs.existsSync(file)) {
        try {
          c3c_json = JSON.parse(fs.readFileSync(file, "utf-8"));
          if (validateAppState(c3c_json)) break;
          c3c_json = null;
        } catch (error) {
          logger.error(`Error parsing ${file}: ${error.message}`);
        }
      }
    }

    if (process.env.APPSTATE || c3c_json) {
      try {
        const envState = process.env.APPSTATE ? JSON.parse(process.env.APPSTATE) : c3c_json;
        if (validateAppState(envState)) {
          await cleanupUserSession("appstate_user", false);
          await accountLogin(
            envState,
            process.env.PREFIX || global.api.prefix,
            admins,
            null,
            null,
            false
          );
        }
      } catch (error) {
        logger.error(`Failed to login with APPSTATE: ${error.message}`);
      }
    }

    if (process.env.EMAIL && process.env.PASSWORD) {
      try {
        await cleanupUserSession("email_user", false);
        await accountLogin(
          null,
          process.env.PREFIX || global.api.prefix,
          admins,
          process.env.EMAIL,
          process.env.PASSWORD,
          false
        );
      } catch (error) {
        logger.error(`Failed to login with EMAIL/PASSWORD: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`Failed to load sessions: ${error.message}`);
  }
}

main();
startServer();

process.on("unhandledRejection", (reason) => {
  logger.error(
    reason instanceof Error
      ? `${reason.name}: ${reason.message}\n${reason.stack}`
      : JSON.stringify(reason)
  );
});