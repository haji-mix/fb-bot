const axios = require('axios');
const randomUserAgent = require('random-useragent');

module.exports["config"] = {
  name: "fbshare",
  isPrivate: true,
  aliases: ["share", "sharehandle", "shareboost", "spamshare"],
  version: "2.0.1",
  role: 1,
  credits: "Kenneth Panio",
  info: "boosting shares on Facebook Post!",
  type: "fbtool",
  usage: "[link] [amount] [optional: cookie]",
  cd: 16,
};

module.exports["run"] = async function ({ api, event, args, chat }) {
  const link = args[0];
  const amount = args[1];
 
  const cookie = args.slice(2).join(" ") || (await api.getAccess());

  if (!link || !amount || !cookie) {
    return chat.reply("❌ Missing required parameters. Usage: fbshare [link] [amount] [optional: cookie]");
  }

  const shareAmount = parseInt(amount);
  if (isNaN(shareAmount)) {
    return chat.reply("❌ Invalid amount. Please provide a valid number.");
  }

  try {
    const result = await api.sharePost(link, cookie, shareAmount);

    if (result.success) {
      chat.reply(`✅ Post shared successfully ${shareAmount} times!`);
    } else {
      chat.reply(`❌ Failed to share post: ${result.error}`);
    }
  } catch (error) {
    chat.reply(error.message || JSON.stringify(error.stack) || "Something Went Wrong unable to share post!");
  }
};

