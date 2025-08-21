const axios = require('axios');

module.exports["config"] = {
  name: "setprofile",
  aliases: ["profilepic", "changeprofile", "profile"],
  version: "1.0.0",
  role: 1,
  credits: "kennethpanio",
  info: "Change your profile picture",
  type: "admin",
  usage: "[reply with attachment or provide URL in args]",
  guide: "reply with an image attachment or provide the image URL as an argument",
  cd: 10,
};

module.exports["run"] = async ({ chat, event, args, font }) => {
  var mono = txt => font.monospace(txt);

  if (event.type !== "message_reply" && args.length === 0) {
    return chat.reply(mono("Please reply to an image or provide an image URL in the arguments!"));
  }

  let imageUrl;
  let caption;
  var def = null;
  let result = "Failed to Update Profile Picture!";

  if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
    imageUrl = event.messageReply.attachments[0].url;
    caption = args.join(" ") || def;
  } else if (args.length > 0) {
    imageUrl = args[0];
    caption = args.slice(1).join(" ") || def;
  }

  if (!imageUrl) {
    return chat.reply(mono("No valid image URL found!"));
  }

  try {
    await chat.profile(imageUrl, caption);
    chat.reply(mono("Profile Picture Updated!"));
  } catch (error) {
    chat.reply(mono(error.stack || error.message || "Failed to Update Profile Picture!"));
  }
};
