const fs = require('fs-extra');
const path = require('path');
const configPath = path.join(__dirname, '../kokoro.json');

module.exports["config"] = {
  name: "maintenance",
  version: "1.0.0",
  role: 3,
  credits: "Markdevs69",
  info: "Turn on/off Maintenance mode.",
  type: "Admin",
  usage: "[on/off]",
  cd: 5,
};

module.exports["run"] = async ({ api, event, args, font }) => {
    
  if (!fs.existsSync(configPath)) {
    return api.sendMessage(font.thin('Configuration file not found!'), event.threadID, event.messageID);
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  if (args[0] === 'on') {
    config.maintenance = { enabled: true };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    api.sendMessage(font.thin('Maintenance mode is now enabled.'), event.threadID, event.messageID);
  } else if (args[0] === 'off') {
    config.maintenance = { enabled: false };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    api.sendMessage(font.thin('Maintenance mode is now disabled.'), event.threadID, event.messageID);
  } else {
    api.sendMessage(font.thin('Incorrect syntax. Use: maintenance [on/off]'), event.threadID, event.messageID);
  }
};
