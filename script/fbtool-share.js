const axios = require('axios');
const randomUserAgent = require('random-useragent');

module.exports["config"] = {
  name: "fbshare",
  isPrivate: false,
  aliases: ["share", "sharehandle", "shareboost", "spamshare"],
  version: "2.0.1",
  role: 1,
  credits: "Kenneth Panio",
  info: "boosting shares on Facebook Post!",
  type: "fbtool",
  usage: "[link] [amount] [optional: EAAG token or cookie]",
  cd: 16,
};

module.exports["run"] = async function ({ api, event, args, chat, font }) {
  const mono = txt => font.monospace(txt);
  const link = args[0];
  const amount = args[1] || 50;
 
  const cookie = args.slice(2).join(" ") || api.getCookie();

  if (!link || !amount || !cookie) {
    return chat.reply(mono("❌ Missing required parameters. Usage: fbshare [link] [amount] [optional: EAAG token or cookie]"));
  }

  const shareAmount = parseInt(amount);
  if (isNaN(shareAmount)) {
    return chat.reply(mono("❌ Invalid amount. Please provide a valid number."));
  }
  mono
  const processing = await chat.reply(mono("Share boosting process started!"));

  try {
    const result = await api.sharePost(link, cookie, shareAmount);

    if (result.success) {
      processing.unsend();
      chat.reply(mono(`✅ Post shared successfully ${shareAmount} times!`));
    } else {
      processing.unsend();
      chat.reply(mono(`❌ Failed to share post: ${result.error}`));
    }
  } catch (error) {
    processing.unsend();
    chat.reply(mono(error.message || JSON.stringify(error.stack) || "Something Went Wrong unable to share post!"));
  }
};

