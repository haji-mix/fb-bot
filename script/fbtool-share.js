const axios = require('axios');
const randomUserAgent = require('random-useragent');

const activeLinks = new Set();

module.exports["config"] = {
  name: "fbshare",
  isPrivate: false,
  aliases: ["share", "sharehandle", "shareboost", "spamshare"],
  version: "2.0.1",
  role: 1,
  credits: "Kenneth Panio",
  info: "Boosting shares on a Facebook Post!",
  type: "fbtool",
  usage: "[link] [amount/5000] [optional: EAAG token or cookie]",
  cd: 16,
};

module.exports["run"] = async function ({ api, event, args, chat, font }) {
  const mono = txt => font.monospace(txt);
  const link = args[0];
  const amount = args[1] || 50;
  const cookie = args.slice(2).join(" ") || api.getCookie();

  if (!link || !amount || !cookie) {
    return chat.reply(mono("❌ Missing required parameters. Usage: fbshare [link] [amount/5000] [optional: EAAG token or cookie]"));
  }

  if (activeLinks.has(link)) {
    return chat.reply(mono("⏳ This link is already being processed. Please wait until it's finished before trying again."));
  }

  const shareAmount = parseInt(amount);
  if (isNaN(shareAmount) || shareAmount <= 0) {
    return chat.reply(mono("❌ Invalid amount. Please provide a valid number."));
  }

  if (shareAmount > 5000) {
    return chat.reply(mono("🚫 The maximum allowed shares per request is 5000. Please enter a lower amount."));
  }

  activeLinks.add(link);

  const processing = await chat.reply(mono("🔄 Share boosting process started!"));

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
    chat.reply(mono(error.message || JSON.stringify(error.stack) || "❌ Something went wrong. Unable to share post!"));
  }

  activeLinks.delete(link);
};
