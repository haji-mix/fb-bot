const axios = require('axios');
const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, '../kokoro.json');

module.exports["config"] = {
  name: "autobot",
  aliases: ["fbbot"],
  info: "This command makes your account a bot",
  type: "tools",
  usage: "online [paging] or create [owner_uid] [prefix] [appstate]",
  version: "1.0.0",
  credits: "mark hitsuraan",
  role: 0,
};

module.exports["run"] = async ({ api, chat, event, args, font, global }) => {
    const tin = txt => font.thin(txt);
  if (!fs.existsSync(configPath)) {
    return chat.reply(tin('Configuration file not found!'), event.threadID, event.messageID);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  
  const server = 
    (config.weblink && config.port ? `${config.weblink}:${config.port}` : null) ||
    config.weblink ||
    (global.host.server[0] && global.host.port ? `${global.host.server[0]}:${global.host.port}` : null) || global.host.server[0];

  const input = args[0];
  let inputState = args.slice(3).join(" ");
  const inputPrefix = args[2] || "";
  const inputAdmin = args[1] || "";
  const page = parseInt(args[1]) || 0;
  const pageSize = 10;

  if (!input) {
    chat.reply(tin(`Autobot usage:\n\nTo create bot use "Autobot create [owner or admin-uid] [prefix] [appstate]"\n\nTo see active list "Autobot [online] [page_number]" or "\n\n`) + server, event.threadID, event.messageID);
    return;
  }

  if (input === "create") {
    if (event.type === "message_reply" && event.messageReply.body) {
      inputState = event.messageReply.body;
    }
    try {
      const states = JSON.parse(inputState);
      if (states && typeof states === 'object') {
        const making = await chat.reply(tin("⏳ Setting up your account as a bot, please wait..."));
        const response = await axios.post(`${server}/login`, {
          state: states,
          prefix: inputPrefix,
          admin: inputAdmin,
        });
        const data = response.data;
        making.edit(tin(data.message));
      } else {
        chat.reply(tin('Invalid input format. Please provide a valid JSON app state.'), event.threadID, event.messageID);
      }
    } catch (parseErr) {
      chat.reply(tin(`Error processing request: ${parseErr.message}`), event.threadID, event.messageID);
    }
  }
};
