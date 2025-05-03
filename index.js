const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const express = require("express");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

global.api = {
  hajime: "https://haji-mix-api.gleeze.com",
};

const {
  workers,
  logger,
  fonts,
  onChat,
  loadModules,
  encryptSession,
  decryptSession,
  getCommands,
  getInfo,
  processExit,
  botHandler,
  minifyHtml,
  obfuscate,
  MongoStore,
} = require("./system/modules");

const hajime_config = fs.existsSync("./hajime.json")
  ? JSON.parse(fs.readFileSync("./hajime.json", "utf-8"))
  : {};
const admins = Array.isArray(hajime_config?.admins)
  ? hajime_config.admins
  : [];
const mongodbUri =
  process.env.MONGODB_URI ||
  hajime_config.mongodbUri ||
  "mongodb+srv://lkpanio25:gwapoko123@cluster0.rdxoaqm.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const pkg_config = fs.existsSync("./package.json")
  ? JSON.parse(fs.readFileSync("./package.json", "utf-8"))
  : { description: "", keywords: [], author: "", name: "" };

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

const sessionStore = new MongoStore({
  uri: mongodbUri,
  collection: "sessions",
  ignoreError: true,
  allowClear: false,
});

const historyStore = new MongoStore({
  uri: mongodbUri,
  collection: "autobot",
  ignoreError: true,
  allowClear: false,
});

const app = express();
app.set("json spaces", 2);
app
  .set("view engine", "ejs")
  .set("views", path.join(__dirname, "public", "views"));
app
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
let server,
  underAttack = false;

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

app
  .use((req, res, next) => {
    const clientIP = getClientIp(req);
    if (blockedIPs.has(clientIP)) {
      switchPort();
      return res.redirect("https://" + clientIP);
    }
    next();
  })
  .use(limiter);

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
  const hajime = await workers();
  let PORT =
    stealth_port ||
    process.env.PORT ||
    hajime_config.port ||
    hajime?.host?.port ||
    10000;
  const lastTimestamp = parseInt(process.env.PORT_TIMESTAMP || 0);
  if (lastTimestamp && Date.now() - lastTimestamp > 3600000) {
    PORT = hajime_config.port || hajime?.host?.port || 10000;
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
const cssFiles = getFilesFromDir("public/framework/css", ".css").map(
  (file) => `./framework/css/${file}`
);
const scriptFiles = getFilmsFromDir("public/views/extra/js", ".js").map(
  (file) => `./views/extra/js/${file}`
);
const styleFiles = getFilesFromDir("public/views/extra/css", ".css").map(
  (file) => `./views/extra/css/${file}`
);
const jsFiles = getFilesFromDir("public/framework/js", ".js").map(
  (file) => `./framework/js/${file}`
);

const routes = [
  { path: "/", file: "index.ejs", method: "get" },
  { path: "/jseditor", file: "ide.ejs", method: "get" },
  {
    path: "/info",
    method: "get",
    handler: (req, res) => getInfo(req, res, Utils),
  },
  {
    path: "/commands",
    method: "get",
    handler: (req, res) => getCommands(req, res, Utils),
  },
  { path: "/login", method: "post", handler: postLogin },
  {
    path: "/restart",
    method: "get",
    handler: (req, res) => processExit(req, res),
  },
  { path: "/login_cred", method: "get", handler: getLogin },
];

routes.forEach((route) => {
  if (route.file) {
    app[route.method](route.path, (req, res) =>
      res.render(
        route.file,
        {
          cssFiles,
          scriptFiles,
          jsFiles,
          description,
          keywords,
          name,
          styleFiles,
          author,
          sitekey,
        },
        (err, html) =>
          err
            ? res.status(500).send("Error rendering template")
            : res.send(obfuscate(minifyHtml(html)))
      )
    );
  } else if (route.handler) {
    app[route.method](route.path, route.handler);
  }
});

app.get("/script/*", (req, res) => {
  const filePath = path.join(__dirname, "script", req.params[0] || "");
  if (!path.normalize(filePath).startsWith(path.join(__dirname, "script"))) {
    return res.status(403).render("403", { cssFiles, jsFiles });
  }
  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      return res
        .status(404)
        .render("404", { cssFiles, jsFiles }, (err, html) => {
          res.send(err ? "Error rendering template" : minifyHtml(html));
        });
    }
    req.query.raw === "true"
      ? res.type("text/plain").send(data)
      : res.render("snippet", { title: req.params[0], code: data });
  });
});

app.use((req, res) =>
  res.status(404).render("404", { cssFiles, jsFiles }, (err, html) => {
    res.send(err ? "Error rendering template" : minifyHtml(html));
  })
);

function getFilesFromDir(directory, fileExtension) {
  const dirPath = path.join(__dirname, directory);
  try {
    return fs.existsSync(dirPath)
      ? fs.readdirSync(dirPath).filter((file) => file.endsWith(fileExtension))
      : [];
  } catch (error) {
    logger.error(`Error reading directory ${directory}: ${error.message}`);
    return [];
  }
}

async function getLogin(req, res) {
  const { email, password, prefix = "", admin } = req.query;
  try {
    await accountLogin(null, prefix, admin ? [admin] : admins, email, password, true);
    res
      .status(200)
      .json({ success: true, message: "Authentication successful" });
  } catch (error) {
    res
      .status(403)
      .json({ error: true, message: error.message || "Invalid credentials" });
  }
}

async function postLogin(req, res) {
  const { state, prefix = "", admin } = req.body;
  try {
    if (
      !state ||
      !state.some((item) => ["i_user", "c_user"].includes(item.key))
    ) {
      throw new Error("Invalid app state data");
    }
    const user = state.find((item) => ["i_user", "c_user"].includes(item.key));
    const existingUser = Utils.account.get(user.value);
    const waitTime = 180000;
    if (
      existingUser &&
      Date.now() - (existingUser.lastLoginTime || 0) < waitTime
    ) {
      const remainingTime = Math.ceil(
        (waitTime - (Date.now() - existingUser.lastLoginTime)) / 1000
      );
      return res.status(400).json({
        error: false,
        duration: remainingTime,
        message: `Account already logged in. Wait ${remainingTime}s to relogin.`,
        user: existingUser,
      });
    }
    await accountLogin(state, prefix, admin ? [admin] : admins, null, null, false);
    Utils.account.set(user.value, { lastLoginTime: Date.now() });
    res
      .status(200)
      .json({ success: true, message: "Authentication successful" });
  } catch (error) {
    res
      .status(400)
      .json({ error: true, message: error.message || "Invalid app state" });
  }
}

async function accountLogin(state, prefix = "", admin = admins, email, password, isExternal = false) {
  const loginOptions = state ? { appState: state } : { email, password };
  if (
    !loginOptions.appState &&
    !(loginOptions.email && loginOptions.password)
  ) {
    throw new Error("Provide appState or email/password");
  }

  return new Promise((resolve, reject) => {
    login(loginOptions, async (error, api) => {
      if (error) return reject(error);
      const appState = state || api.getAppState();
      const userid = await api.getCurrentUserID();

      const existingSession = await sessionStore.get(userid);
      if (existingSession) {
        const decryptedSession = decryptSession(existingSession);
        if (
          decryptedSession &&
          JSON.stringify(decryptedSession) === JSON.stringify(appState)
        ) {
          logger.warn(`Duplicate session for user ${userid}, skipping storage`);
          return reject(new Error("Duplicate session detected"));
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

      if (!isExternal) {
        await addThisUser(userid, appState, prefix, admin_uid);
      } else {
        logger.info(`External session for user ${userid}, not storing in MongoStore`);
      }

      Utils.account.set(userid, {
        name: "ANONYMOUS",
        userid,
        profile_img: `https://graph.facebook.com/${userid}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
        profile_url: `https://facebook.com/${userid}`,
        time: 0,
        online: true,
      });

      setInterval(() => {
        const account = Utils.account.get(userid);
        if (!account) return;
        Utils.account.set(userid, { ...account, time: account.time + 1 });
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
          if (error || !event) {
            logger.chalk.yellow(error?.stack || error);
            process.exit(0);
          }
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
      } catch (error) {
        Utils.account.delete(userid);
        if (!isExternal) await deleteThisUser(userid);
        reject(error);
      }
      resolve();
    });
  });
}

async function addThisUser(userid, state, prefix, admin) {
  const existingSession = await sessionStore.get(userid);
  if (existingSession) {
    logger.warn(`Session for user ${userid} already exists, skipping storage`);
    return;
  }
  await sessionStore.put(userid, encryptSession(state));
  await historyStore.put(userid, { catersuserid, prefix: prefix || "", admin, time: 0 });
}

async function deleteThisUser(userid) {
  await sessionStore.remove(userid);
  await historyStore.remove(userid);
}

function aliases(command) {
  const entry = Array.from(Utils.commands.entries()).find(([commands]) =>
    commands?.includes(command?.toLowerCase())
  );
  return entry ? entry[1] : null;
}

async function main() {
  await sessionStore.start();
  await historyStore.start();

  const empty = require("fs-extra");
  const cacheFile = "./script/cache";
  if (!fs.existsSync(cacheFile)) fs.mkdirSync(cacheFile, { recursive: true });

  setInterval(async () => {
    try {
      const historyEntries = await historyStore.entries();
      for (const { key: userid, value: user } of historyEntries) {
        const update = Utils.account.get(userid);
        if (update) {
          await historyStore.put(userid, { ...user, time: update.time });
        }
      }
      await empty.emptyDir(cacheFile);
    } catch (error) {
      logger.error("Error executing task: " + error.stack);
    }
  }, 60000);

  const loadSession = async (userid, prefix, admin) => {
    try {
      const state = await sessionStore.get(userid);
      if (!state) {
        logger.chalk.yellow(`Session for user ${userid} does not exist`);
        return;
      }
      const decryptedSession = decryptSession(state);
      if (!decryptedSession) {
        logger.chalk.yellow(`Invalid session data for user ${userid}`);
        return;
      }
      await accountLogin(decryptedSession, prefix || "", admin ? [admin] : admins, null, null, false);
    } catch (error) {
      const ERROR_PATTERNS = {
        unsupportedBrowser: /https:\/\/www\.facebook\.com\/unsupportedbrowser/,
        errorRetrieving: /Error retrieving userID.*unknown location/,
        connectionRefused: /Connection refused: Server unavailable/,
        notLoggedIn: /Not logged in\./,
      };
      const ERROR = error?.message || error?.error;
      for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
        if (pattern.test(ERROR)) {
          logger.chalk.yellow(`Login issue for user ${userid}: ${type}`);
          await deleteThisUser(userid);
          break;
        }
      }
    }
  };

  const historyEntries = await historyStore.entries();
  for (const { key: userid, value: userConfig } of historyEntries) {
    await loadSession(userid, userConfig.prefix, userConfig.admin);
  }

  const validateJsonArrayOfObjects = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every((item) => typeof item === "object" && item !== null);
  };

  let c3c_json = null;
  for (const file of ["./appstate.json", "./fbstate.json"]) {
    if (fs.existsSync(file)) {
      try {
        c3c_json = JSON.parse(fs.readFileSync(file, "utf-8"));
        if (validateJsonArrayOfObjects(c3c_json)) break;
        c3c_json = null;
      } catch (error) {
        logger.error(`Error parsing ${file}: ${error.message}`);
      }
    }
  }

  if (process.env.APPSTATE || c3c_json) {
    try {
      const envState = process.env.APPSTATE
        ? JSON.parse(process.env.APPSTATE)
        : c3c_json;
      if (validateJsonArrayOfObjects(envState)) {
        await accountLogin(envState, process.env.PREFIX || "#", admins, null, null, true);
      }
    } catch (error) {
      logger.error(error.stack || error);
    }
  }

  if (process.env.EMAIL && process.env.PASSWORD) {
    try {
      await accountLogin(
        null,
        process.env.PREFIX || "#",
        admins,
        process.env.EMAIL,
        process.env.PASSWORD,
        true
      );
    } catch (error) {
      logger.error(error.stack || error);
    }
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