const config = {
  name: "smsbomb",
  aliases: ["smsb", "otpbomb"],
  description: "Send Bulk OTP SMS Bomb to target PH number",
  author: "Kenneth Panio",
  cooldown: 10,
  usage: "[PH Number e.g: +63] [amount e.g: 10]",
};

async function run({ chat, font }) {
  const number = args[0];
  const amount = args[1] || 20;

  try {
    const { get } = require("axios");
    const init = await get(
      `${global.api.hajime}/api/smsbomber?phone=${number}times=${amount}`
    );
    chat.reply(font.thin(JSON.stringify(init.data.details, null, 2)));
  } catch (error) {
    chat.reply(
      font.thin(error.response?.error || error.stack || error.message)
    );
  }
}


module.exports = { config, run }