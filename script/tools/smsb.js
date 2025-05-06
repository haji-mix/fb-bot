module.exports.config = {
  name: "smsbomb",
  aliases: ["smsb", "otpbomb"],
  type: "tools",
  description: "Send Bulk OTP SMS Bomb to target PH number",
  author: "Kenneth Panio",
  cooldown: 10,
  usage: "[PH Number e.g: +63] [amount e.g: 10]",
};

module.exports.run = async function({ args, chat, font }) {
  const phone = args[0] || "";
  const amount = args[1] || 20;

  if (phone.startsWith("+63")) {
    phone = phone.slice(3);
  } else if (phone.startsWith("63")) {
    phone = phone.slice(2);
  } else if (phone.startsWith("0")) {
    phone = phone.slice(1);
  }

  if (!phone || !/^\d{10}$/.test(phone)) {
    return chat.reply(
      font.thin("Invalid phone number format. Use: +63xxxxxxxxxx")
    );
  }

  const sent = chat.reply(font.thin("SMS Bomb Initiated!"));

  try {
    const { get } = require("axios");
    const init = await get(
      `${global.api.hajime}/api/smsbomber?phone=${phone}&times=${amount}`
    );
    sent.delete();
    chat.reply(font.thin(JSON.stringify(init.data.details, null, 2)));
  } catch (error) {
    sent.delete();
    chat.reply(
      font.thin(error.stack || error.message || "API IS NOT AVAILABLE!")
    );
  }
};
