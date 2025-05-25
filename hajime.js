const fs = require("fs");
const path = require("path");
const login = require("./chatbox-fca-remake/package/index");
const express = require("express");
require("dotenv").config();

global.api = {
  hajime: "https://haji-mix-api.gleeze.com",
  mongo_uri: "YOUR MONGO URI or PUT IT in .env"
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
  createStore,
  CurrencySystem
} = require("./system/modules");

const hajime_config = fs.existsSync("./hajime.json")
  ? JSON.parse(fs.readFileSync("./hajime.json", "utf-8"))
  : {};
const admins = Array.isArray(hajime_config?.admins) ? hajime_config.admins.map(String) : [];
const pkg_config = fs.existsSync("./package.json")
  ? JSON.parse(fs.readFileSync("./package.json", "utf-8"))
  : { description: "", keywords: [], author: "", name: "" };

const mongoStore = createStore({
  type: "mongodb",
  uri: process.env.mongo_uri || global.api.mongo_uri,
  database: "FB_AUTOBOT",
  collection: "APPSTATE",
  isOwnHost: false,
  ignoreError: false,
  allowClear: false,
  createConnection: false,
});

const currencySystem = new CurrencySystem({
  database: "FB_AUTOBOT",
  collection: "currency_balances",
  defaultBalance: 0,
});

async function ensureMongoConnection() {
  try {
    await mongoStore.get("connection_test");
    logger.success("MongoDB connection verified");
    return true;
  } catch (error) {
    logger.error("Failed to connect to MongoDB: " + error.message);
    throw error;
  }
}

const Utils = {
  commands: new Map(),
  handleEvent: new Map(),
  account: new Map(),
  cooldowns: new Map(),
  ObjectReply: new Map(),
  limited: new Map(),
  handleReply: [],
  userActivity: { reactedMessages: new Set() },
  Currencies: currencySystem,
};

loadModules(Utils, logger);

const app = express();
app.set("json spaces", 2);
app
  .set("view engine", "ejs")
  .set("views", path.join(__dirname, "public", "views"));
app
  .use(express.json())
  .use(express.urlencoded({ extended: false }))
  .use(express.static(path.join(__dirname, "public")));

async function startServer() {
  const PORT = process.env.PORT || hajime_config.port || 10000;
  const serverUrl = hajime_config.weblink || `http://localhost:${PORT}`;
  app.listen(PORT, () =>
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
            : res.send(html)
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
    await Utils.accountLogin(null, prefix, admin ? [admin] : admins, email, password);
    res
      .status(200)
      .json({ success: true, message: "Authentication successful" });
  } catch (error) {
    logger.error(`Login failed for email/password: ${error.message}`);
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

    const existingUser = await mongoStore.get(`user_${user.value}`);
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

    await Utils.accountLogin(state, prefix, admin ? [admin] : admins);

    await mongoStore.put(`user_${user.value}`, {
      lastLoginTime: Date.now(),
      userId: user.value,
    });

    res
      .status(200)
      .json({ success: true, message: "Authentication successful" });
  } catch (error) {
    logger.error(`Post login failed: ${error.message}`);
    if (state) {
      const user = state.find((item) => ["i_user", "c_user"].includes(item.key));
      if (user) {
        await deleteThisUser(user.value);
      }
    }
    res
      .status(400)
      .json({ error: true, message: error.message || "Invalid app state" });
  }
}

async function accountLogin(
  state,
  prefix = "",
  admin = admins,
  email,
  password
) {
  const loginOptions = state ? { appState: state } : { email, password };
  if (
    !loginOptions.appState &&
    !(loginOptions.email && loginOptions.password)
  ) {
    throw new Error("Provide appState or email/password");
  }

  return new Promise((resolve, reject) => {
    logger.info(
      `Initiating login with ${state ? "appState" : "email/password"}`
    );
    login(loginOptions, async (error, api) => {
      if (error || !api) {
        const errorMsg = error?.message || "API object is null";
        logger.error(`Login failed: ${errorMsg}`);
        
        return reject(error || new Error("API object is null"));
      }

      try {
        const appState = state || api.getAppState();
        const userid = await api.getCurrentUserID();

        if (!userid) {
          logger.error("Failed to get user ID from API");
          await deleteThisUser(userid);
          return reject(new Error("Failed to get user ID"));
        }

        logger.info(`Logged in user ${userid}`);

        const existingSession = await mongoStore.get(`session_${userid}`);
        if (
          existingSession &&
          JSON.stringify(existingSession) === JSON.stringify(appState)
        ) {
          logger.info(`Session for user ${userid} exists in MongoDB`);
          if (Utils.account.get(userid)?.online) {
            logger.info(`User ${userid} is already online, reusing session`);
            resolve();
            return;
          }
        } else if (existingSession) {
          logger.warn(`Session conflict for user ${userid}, overwriting...`);
          await mongoStore.put(`session_${userid}`, appState);
        }
        const adminList = [
          ...new Set([
            ...(Array.isArray(admins) ? admins.map(String) : []),
            ...(Array.isArray(admin) ? admin.map(String) : [String(admin || '')]),
          ]),
        ].filter(Boolean); 
        
        const facebookUrlRegex = /^(?:https?:\/\/)?(?:www\.)?facebook\.com\/[a-zA-Z0-9.]+$/i;
        
        const resolvedAdminList = await Promise.all(
          adminList.map(async (item) => {
            if (facebookUrlRegex.test(item)) {
              try {
                const userId = await api.getUID(item);
                return userId || item; 
              } catch (err) {
                return item;
              }
            }
            return item;
          })
        );

        await addThisUser(userid, appState, prefix, resolvedAdminList);

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
            mongoStore
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

        require('./system/cronjob')({
          logger,
          api,
          fonts,
          font: fonts,
        });

        require('./system/notevent')({
          logger,
          api,
          fonts,
          font: fonts,
          prefix
        });

        api.listenMqtt((error, event) => {
          if (error || !"type" in event) {
            logger.warn(
              `MQTT error for user ${userid}: ${error?.stack || error}`
            );
            Utils.account.delete(userid);
            deleteThisUser(userid);
            return;
          }

          logger.info(
            `MQTT event received for user ${userid}: ${JSON.stringify(
              event,
              null,
              2
            )}`
          );
          const chat = new onChat(api, event);
          Object.getOwnPropertyNames(Object.getPrototypeOf(chat))
            .filter(
              (key) =>
                typeof chat[key] === "function" && key !== "constructor"
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
            admin: resolvedAdminList, 
            prefix,
            userid,
          });
        });
        logger.success(`MQTT listener set up for user ${userid}`);

        resolve();
      } catch (innerError) {
        logger.error(`Error in accountLogin: ${innerError.message}`);
        try {
          const userid = await api?.getCurrentUserID();
          if (userid) {
            await deleteThisUser(userid);
          }
        } catch (e) {
          logger.error(`Error while cleaning up failed login: ${e.message}`);
        }
        return reject(innerError);
      }
    });
  });
}

Utils.accountLogin = accountLogin;

async function addThisUser(userid, state, prefix, admin) {
  try {
    await mongoStore.put(`session_${userid}`, state);
    await mongoStore.put(`config_${userid}`, {
      userid,
      prefix: prefix || "",
      admin: [
        ...new Set([
          ...(Array.isArray(admins) ? admins.map(String) : []),
          ...(Array.isArray(admin) ? admin.map(String) : [String(admin || '')]),
        ]),
      ].filter(Boolean), 
      time: 0,
      createdAt: Date.now(),
    });
    logger.info(`Added user ${userid} to MongoDB session store`);
  } catch (error) {
    logger.error(`Failed to add user ${userid}: ${error.message}`);
    throw error;
  }
}

async function deleteThisUser(userid) {
  try {
    if (!userid) return;
    
    await mongoStore.remove(`session_${userid}`);
    await mongoStore.remove(`config_${userid}`);
    await mongoStore.remove(`user_${userid}`);
    logger.info(`Deleted user ${userid} from MongoDB session store`);
  } catch (error) {
    logger.error(`Failed to delete user ${userid}: ${error.message}`);
    throw error;
  }
}

function aliases(command) {
  const entry = Array.from(Utils.commands.entries()).find(([commands]) =>
    commands?.includes(command?.toLowerCase())
  );
  return entry ? entry[1] : null;
}

async function main() {
  const cacheFile = "./script/cache";

  if (!fs.existsSync(cacheFile)) {
    fs.mkdirSync(cacheFile, { recursive: true });
  }

  setInterval(async () => {
    try {
      const configs = (await mongoStore.entries()) || [];
      const users = configs.filter(
        (entry) => entry && entry.key && entry.key.startsWith("config_")
      );

      for (const { key, value } of users) {
        if (key && value && value.userid) {
          const userid = value.userid;
          const update = Utils.account.get(userid);
          if (update) {
            value.time = update.time;
            await mongoStore.put(key, value);
          }
        }
      }
    } catch (error) {
      logger.error("Error executing task: " + error.stack);
    }
  }, 60000);

  const validateAppState = (state) => {
    return (
      Array.isArray(state) &&
      state.length > 0 &&
      state.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          "key" in item &&
          "value" in item
      ) &&
      state.some((item) => ["i_user", "c_user"].includes(item.key))
    );
  };

  const loadMongoSession = async (userid) => {
    if (!userid) {
      logger.warn("Attempted to load session with invalid userid");
      return false;
    }

    try {
      logger.info(`Loading MongoDB session for user ${userid}`);
      const session = await mongoStore.get(`session_${userid}`);
      const userConfig = await mongoStore.get(`config_${userid}`);

      if (!session || !userConfig) {
        logger.warn(`No session or config found for user ${userid} in MongoDB`);
        await deleteThisUser(userid);
        return false;
      }

      if (!validateAppState(session)) {
        logger.warn(`Invalid app state for user ${userid} in MongoDB`);
        await deleteThisUser(userid);
        return false;
      }

      if (Utils.account.get(userid)?.online) {
        logger.info(
          `User ${userid} already logged in, skipping MongoDB session load`
        );
        return true;
      }

      await Utils.accountLogin(
        session,
        userConfig?.prefix || "",
        [
          ...new Set([
            ...(Array.isArray(admins) ? admins.map(String) : []),
            ...(Array.isArray(userConfig?.admin) ? userConfig?.admin.map(String) : [String(userConfig?.admin || '')]),
          ]),
        ].filter(Boolean)
      );
      logger.success(`Successfully loaded MongoDB session for user ${userid}`);
      return true;
    } catch (error) {
      logger.error(
        `Failed to load MongoDB session for user ${userid}: ${error.message}`
      );
      
      const ERROR_PATTERNS = {
        unsupportedBrowser: /https:\/\/www\.facebook\.com\/unsupportedbrowser/,
        errorRetrieving: /Error retrieving userID.*unknown location/,
        connectionRefused: /Connection refused: Server unavailable/,
        notLoggedIn: /Not logged in\./,
      };
      const ERROR = error?.message || error?.error;
      for (const [type, pattern] of Object.entries(ERROR_PATTERNS)) {
        if (pattern && ERROR && pattern.test(ERROR)) {
          logger.warn(`Login issue for user ${userid}: ${type} - ${ERROR}`);
          await deleteThisUser(userid);
          break;
        }
      }
      return false;
    }
  };

  try {
    await ensureMongoConnection();

    logger.info("Loading sessions from MongoDB...");

    const sessions = (await mongoStore.entries()) || [];
    const userIds = new Set();

    for (const entry of sessions) {
      if (
        entry &&
        typeof entry.key === "string" &&
        entry.key.startsWith("session_")
      ) {
        const userid = entry.key.substring("session_".length).trim();
        if (userid) userIds.add(userid);
      }
    }

    const loadPromises = Array.from(userIds).map((userid) =>
      loadMongoSession(userid)
    );

    await Promise.allSettled(loadPromises);

    logger.success(`Loaded ${userIds.size} sessions from MongoDB`);
  } catch (error) {
    logger.error(`Failed to load sessions: ${error?.message || error}`);
  }
}

(async () => {
  try {
    await mongoStore.start();
    logger.success("Connected to MongoDB for session storage");
    await currencySystem.init();
    logger.success("Connected to MongoDB for currency system");
    await main();
    await startServer();
    startHealthCheck();
  } catch (error) {
    logger.error(`Failed to initialize: ${error.message}`);
    process.exit(1);
  }
})();

function startHealthCheck() {
  setInterval(async () => {
    try {
      for (const [userid, account] of Utils.account.entries()) {
        if (!account.api) continue;
        await account.api.getCurrentUserID();
        logger.info(`Health check passed for user ${userid}`);
      }
    } catch (error) {
      logger.error(`Health check failed: ${error.message}. Restarting...`);
      process.exit(1);
    }
  }, 300000);
}

process.on("unhandledRejection", (reason) => {
  logger.error(
    reason instanceof Error
      ? `${reason.name}: ${reason.message}\n${reason.stack}`
      : JSON.stringify(reason)
  );
});

