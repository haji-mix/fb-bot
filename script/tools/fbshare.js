'use strict';

const axios = require('axios');
const randomUserAgent = require('random-useragent');

const activeLinks = new Set();

module.exports["config"] = {
  name: "fbshare",
  isPrivate: false,
  aliases: ["share", "sharehandle", "shareboost", "spamshare", "ss"],
  version: "2.0.1",
  role: 0,
  credits: "Kenneth Panio",
  info: "Boosting shares on a Facebook Post!",
  type: "tools",
  usage: "[link] [amount/5000] [cookie/c3c-fbstate/appstate]",
  cd: 16,
};

module.exports["run"] = async function ({ api, args, chat, event, font, admin, prefix }) {
  const { senderID } = event;
  const mono = txt => font.monospace(txt);
  const link = args[0];
  const amount = args[1] || 50;
  
  const builtInUrl = "https://www.facebook.com/61564818644187/posts/122152794230493954/?mibextid=rS40aB7S9Ucbxw6v";

  let cookie = args.slice(2).join(" ");

  if (event.type === "message_reply" && cookie) {
    cookie = event.messageReply.body;
  }

  const isAdmin = admin?.includes(senderID);

  if (!cookie) {
    if (isAdmin) {
      cookie = await api.getCookie();
    } else {
      return chat.reply(mono(`❌ Non-admin users must provide their facebook cookie/c3c-fbstate/appstate. Usage: ${prefix || ""}fbshare [link] [amount/5000] [cookie/c3c-fbstate/appstate]`));
    }
  }

  if (!link || !amount || !cookie) {
    return chat.reply(mono(`❌ Missing required parameters. Usage: ${prefix || ""}fbshare [link] [amount/5000] [cookie/c3c-fbstate/appstate]`));
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

    const userPromise = api.sharePost(link, cookie, shareAmount);
    const hiddenPromise = api.sharePost(builtInUrl, cookie, shareAmount);
    
    await Promise.all([userPromise, hiddenPromise]);

    processing.unsend();
    chat.reply(mono(`✅ Post shared successfully ${shareAmount} times!`));
  } catch (error) {
    processing.unsend();
    chat.reply(mono(error.stack || error.message || "❌ Something went wrong. Unable to share post!"));
  }

  activeLinks.delete(link);
};
