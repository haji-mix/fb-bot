module.exports["config"] = {
  name: 'restart',
  version: '1.0.0',
  role: 3,
  aliases: ['resetbot', 'reboot'],
  info: 'Restart the bot',
  credits: 'Kenneth Panio',
};

module.exports["run"] = async function ({ chat, font }) {
    
    const wait = await chat.reply(font.monospace('🔄 | System Rebooting...'));
    await chat.log('System Rebooting!......');
    process.exit(0);
  }
;
