module.exports["config"] = {
  name: "uid",
  version: "1.3.0",
  isPrefix: false,
  role: 0,
  type: "bot-utility",
  aliases: ["id", "userid", "fbid"],
  info: "Get your id or from facebook users",
  usage: "[mention/fbplink]",
  credits: "Kenneth Panio",
};

module.exports["run"] = async ({ event, args, chat, font }) => {
  const { mentions, senderID } = event;
  const link = args.join(" ");

  try {

    if (event.type === "message_reply" && !link) {
      return chat.reply(event.messageReply.senderID);
    }

    if (!link) {
      chat.contact(`${senderID}`, senderID);
      return;
    }

    if (Object.keys(mentions).length > 0) {
      for (const mentionID in mentions) {
        chat.contact(`${mentionID}`, mentionID);
      }
      return;
    }

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    const isFacebookLink = facebookLinkRegex.test(link);

    if (isFacebookLink) {
      const uid = await chat.uid(link);
      if (uid) {
        chat.contact(uid, uid);
      } else {
        chat.reply(
          font.thin(
            "❗ | Unable to retrieve UID from the provided Facebook link."
          )
        );
      }
      return;
    }

    chat.reply(
      font.thin(`❓ | Please provide a valid Facebook link or mention a user.`)
    );
  } catch (error) {
    chat.reply(font.thin(error.stack || error.message));
  }
};
