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
  generateUserAgent,
  getCommands,
  getInfo,
  processExit,
  botHandler,
  minifyHtml,
  obfuscate,
} = require("./system/modules");

const hajime_config = JSON.parse(fs.readFileSync("./hajime.json", "utf-8"));
const pkg_config = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

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
app.enable("trust proxy").set("json spaces", 2);
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

// Initialize self IP as trusted
let selfIP = null;
getSelfIP().then(ip => {
  if (ip) {
    selfIP = ip;
    TRUSTED_IPS.push(ip);
    logger.success(`Added self IP ${ip} to trusted IPs`);
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

const { description, keywords, author, name } = pkg_config;
const sitekey = process.env.sitekey || hajime_config.sitekey;
const cssFiles = getFilesFromDir("public/framework/css", ".css").map(
  (file) => `./framework/css/${file}`
);
const scriptFiles = getFilesFromDir("public/views/extra/js", ".js").map(
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
  return fs.existsSync(dirPath)
    ? fs.readdirSync(dirPath).filter((file) => file.endsWith(fileExtension))
    : [];
}

async function getLogin(req, res) {
  const { email, password, prefix, admin } = req.query;
  try {
    await accountLogin(null, prefix, [admin], email, password);
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
  const { state, prefix, admin } = req.body;
  try {
    if (
      !state ||
      !state.some((item) => ["i_user", "c_user"].includes(item.key))
    ) {
      throw new Error("Invalid app state data");
    }
    const user = state.find((item) => ["i_user", "c_user"].includes(item.key));
    const existingUser = Utils.account.get(user.value);
    const waitTime = 180000; // 3 minutes
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
    await accountLogin(state, prefix, [admin]);
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

async function accountLogin(state, prefix = "", admin = [], email, password) {
  const loginOptions = state ? { appState: state } : { email, password };
  if (
    !loginOptions.appState &&
    !(loginOptions.email && loginOptions.password)
  ) {
    throw new Error("Provide appState or email/password");
  }

  // Check if login is from appstate.json, fbstate.json, env.APPSTATE, or env.EMAIL/PASSWORD
  const isExternalState =
    fs.existsSync("./appstate.json") ||
    fs.existsSync("./fbstate.json") ||
    process.env.APPSTATE ||
    (process.env.EMAIL && process.env.PASSWORD);

  return new Promise((resolve, reject) => {
    login(loginOptions, async (error, api) => {
      if (error) return reject(error);
      const appState = state || api.getAppState();
      const userid = await api.getCurrentUserID();
      const sessionFile = path.join("./data/session", `${userid}.json`);

      if (fs.existsSync(sessionFile)) {
        const existingSession = JSON.parse(
          fs.readFileSync(sessionFile, "utf8")
        );
        if (
          JSON.stringify(decryptSession(existingSession)) ===
          JSON.stringify(appState)
        ) {
          return reject(new Error("Duplicate session detected"));
        }
      }

      let admin_uid = admin;
      if (/(?:https?:\/\/)?(?:www\.)?facebook\.com/i.test(admin)) {
        admin_uid = await api.getUID(admin).catch(() => admin);
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
            admin,
            prefix,
            userid,
          });
        });
      } catch (error) {
        Utils.account.delete(userid);
        if (!isExternalState) await deleteThisUser(userid);
        reject(error);
      }
      resolve();
    });
  });
}

async function addThisUser(userid, state, prefix, admin) {
  const configFile = "./data/history.json";
  const sessionFile = path.join("./data/session", `${userid}.json`);
  if (fs.existsSync(sessionFile)) return;
  const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  config.push({ userid, prefix: prefix || "", admin, time: 0 });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  fs.writeFileSync(sessionFile, JSON.stringify(encryptSession(state)));
}

async function deleteThisUser(userid) {
  const configFile = "./data/history.json";
  const sessionFile = path.join("./data/session", `${userid}.json`);
  const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  const index = config.findIndex((item) => item.userid === userid);
  if (index !== -1) config.splice(index, 1);
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile);
}

function aliases(command) {
  const entry = Array.from(Utils.commands.entries()).find(([commands]) =>
    commands?.includes(command?.toLowerCase())
  );
  return entry ? entry[1] : null;
}

async function main() {
  const empty = require("fs-extra");
  const sessionFolder = path.join("./data/session");
  const configFile = "./data/history.json";
  const cacheFile = "./script/cache";

  // Create necessary directories if they don't exist
  [cacheFile, sessionFolder, path.dirname(configFile)].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
  if (!fs.existsSync(configFile)) fs.writeFileSync(configFile, "[]", "utf-8");

  setInterval(async () => {
    try {
      const history = JSON.parse(fs.readFileSync(configFile, "utf-8"));
      history.forEach((user) => {
        if (user?.userid) {
          const update = Utils.account.get(user.userid);
          if (update) user.time = update.time;
        }
      });
      await empty.emptyDir(cacheFile);
      fs.writeFileSync(configFile, JSON.stringify(history, null, 2));
    } catch (error) {
      logger.error("Error executing task: " + error.stack);
    }
  }, 60000);

  const loadSession = async (filePath, userId, prefix, admin) => {
    try {
      // Verify file exists before attempting to read
      if (!fs.existsSync(filePath)) {
        logger.chalk.yellow(
          `Session file for user ${userId} does not exist: ${filePath}`
        );
        return;
      }
      const state = decryptSession(
        JSON.parse(fs.readFileSync(filePath, "utf-8"))
      );
      await accountLogin(state, prefix, admin);
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
          logger.chalk.yellow(`Login issue for user ${userId}: ${type}`);
          await deleteThisUser(userId);
          break;
        }
      }
    }
  };

  const config = JSON.parse(fs.readFileSync(configFile, "utf-8"));
  let files = [];
  if (fs.existsSync(sessionFolder)) {
    files = fs
      .readdirSync(sessionFolder)
      .filter((file) => file.endsWith(".json"));
  } else {
    logger.error(
      `Session folder does not exist: ${sessionFolder}. Skipping session loading.`
    );
  }

  for (const file of files) {
    const userId = path.parse(file).name;
    const { prefix, admin } =
      config.find((item) => item.userid === userId) || {};
    await loadSession(path.join(sessionFolder, file), userId, prefix, admin);
  }

  const validateJsonArrayOfObjects = (data) => {
    if (!Array.isArray(data) || data.length === 0) return false;
    return data.every((item) => typeof item === "object" && item !== null);
  };

  const admins = Array.isArray(hajime_config?.admins)
    ? hajime_config.admins
    : [];

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
        await accountLogin(envState, process.env.PREFIX || "#", admins); // Session won't be saved due to isExternalState
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
        process.env.PASSWORD
      ); // Session won't be saved due to isExternalState
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