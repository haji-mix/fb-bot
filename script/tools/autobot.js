const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, '../../hajime.json');

module.exports["config"] = {
  name: "autobot",
  aliases: ["fbbot"],
  info: "This command makes your account a bot",
  type: "tools",
  usage: "[online] [paging] or create [owner_uid] [prefix] [appstate]",
  version: "1.0.0",
  credits: "mark hitsuraan",
  role: 0,
};

module.exports["run"] = async ({ chat, event, args, font, Utils }) => {
  const tin = txt => font.thin(txt);

  // Validate app state
  const validateAppState = (state) => {
    return (
      Array.isArray(state) &&
      state.length > 0 &&
      state.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          ("key" in item || "name" in item) &&
          typeof (item.key || item.name) === "string" &&
          typeof item.value === "string"
      ) &&
      state.some((item) => ["i_user", "c_user"].includes(item.key || item.name))
    );
  };

  if (!fs.existsSync(configPath)) {
    return chat.reply(tin('Configuration file not found!'), event.threadID, event.messageID);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  const input = args[0];
  let inputState = args.slice(3).join(" ");
  const inputPrefix = args[2] || "";
  const inputAdmin = args[1] || "";
  const page = parseInt(args[1]) || 0;
  const pageSize = 10;

  if (!input) {
    const server = 
      (config.weblink && config.port ? `${config.weblink}:${config.port}` : null) ||
      config.weblink;
    chat.reply(tin(`Autobot usage:\n\nTo create bot use "Autobot create [owner or admin-uid] [prefix] [appstate]"\n\nTo see active list "Autobot [online] [page_number]\n\n`) + server, event.threadID, event.messageID);
    return;
  }

  if (input === "online") {
    const checking = await chat.reply(tin("⏳ Checking active session, please wait..."));
    try {
      const aiList = Array.from(Utils.account.values()).filter(account => account.online);

      if (Array.isArray(aiList)) {
        const totalPages = Math.ceil(aiList.length / pageSize);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedList = aiList.slice(startIndex, endIndex);

        let message = paginatedList.map((result, index) => {
          const { profile_url, time } = result;

          const days = Math.floor(time / (3600 * 24));
          const hours = Math.floor((time % (3600 * 24)) / 3600);
          const minutes = Math.floor((time % 3600) / 60);
          const seconds = Math.floor(time % 60);
          
          let uptimeMessage = `[ ${startIndex + index + 1} ]\nPROFILE URL: ${profile_url}\nUPTIME: `;
          if (days > 0) uptimeMessage += `${days} days `;
          if (hours > 0) uptimeMessage += `${hours} hours `;
          if (minutes > 0) uptimeMessage += `${minutes} minutes `;
          uptimeMessage += `${seconds} seconds\n\n`;

          return uptimeMessage;
        }).join('');

        message += `Page ${currentPage} of ${totalPages}\nUse "Autobot online [page_number]" to view other pages.`;
        chat.reply(font.bold(`List of Active Bots.\n\n`) + message, event.threadID, event.messageID);
      } else {
        chat.reply(tin("ERROR: List of Bots is not an array"), event.threadID, event.messageID);
      }
      checking.delete();
    } catch (err) {
      checking.delete();
      chat.reply(tin(err.stack || err.message), event.threadID, event.messageID);
    }
  } else if (input === "create") {
    if (event.type === "message_reply" && event.messageReply.body) {
      inputState = event.messageReply.body;
    }
    try {
      const states = JSON.parse(inputState);
      if (validateAppState(states)) {
        const making = await chat.reply(tin("⏳ Setting up your account as a bot, please wait..."));
        try {
          await Utils.accountLogin(states, inputPrefix, inputAdmin ? [inputAdmin] : config.admins);
          making.edit(tin("Authentication successful"));
        } catch (loginErr) {
          making.edit(tin(`Login failed: ${loginErr.message}`));
        }
      } else {
        chat.reply(tin('Please provide a valid JSON app state. e.g: autobot create [owner_uid] [prefix] [{"key":"c_user","value":"..."},...]'), event.threadID, event.messageID);
      }
    } catch (parseErr) {
      chat.reply(tin(`${parseErr.stack || parseErr.message}`), event.threadID, event.messageID);
    }
  }
};