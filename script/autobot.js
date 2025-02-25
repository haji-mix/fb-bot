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
    chat.reply(tin(`Autobot usage:\n\nTo create bot use "Autobot create [owner or admin-uid] [prefix] [appstate]"\n\nTo see active list "Autobot [online] [page_number]`) + server, event.threadID, event.messageID);
    return;
  }

  if (input === "online") {
    try {
      const checking = await chat.reply(tin("⏳ Checking active session, please wait..."));
      const url = `${server}/info`;
      const response = await axios.get(url);
      const aiList = response.data;

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

          // Construct uptime message dynamically
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
        chat.reply(tin("Handle error: aiList is not an array"), event.threadID, event.messageID);
      }
    } catch (err) {
      chat.reply(tin(err.message), event.threadID, event.messageID);
    }
  } else if (input === "create") {
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
        chat.reply(tin('Please provide a valid JSON app state. e.g: autobot nline [paging] or create [owner_uid] [prefix] [appstate]'), event.threadID, event.messageID);
      }
    } catch (parseErr) {
      chat.reply(tin(`Error processing request: ${parseErr.message}`), event.threadID, event.messageID);
    }
  }
};
