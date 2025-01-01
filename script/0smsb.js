const { get } = require("axios");

module.exports["config"] = {
    name: "smsb",
    type: "tools",
    aliases: ["otpflush",
        "otpb",
        "otpbomb"],
    info: "Send bulk SMS to a target phone number for testing purposes.",
    author: "Kenneth Panio",
    cd: 10,
    usage: "[number] [times]",
}

module.exports["run"] = async ({ args, chat, font, global }) => {
    const phone = args[0];
    const times = args[1] || "";
    
    try {
      const smsb = await get(global.api.kokoro[0] + `/smsbomber?phone=${phone}&times=${times}`);
      const { message, details } = smsb.data;
      const format = `${message}\n\nSuccess: ${details.success} Failed: ${details.failed}`;
      chat.reply(font.thin(format));
    } catch(error) {
      chat.reply(font.thin(error.response?.data?.error || error.message || "Something went wrong with the API!"));
      }
}