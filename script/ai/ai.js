const axios = require("axios");
const { randomUUID } = require('crypto');

module.exports["config"] = {
  name: "gpt4o",
  isPrefix: false,
  aliases: ["gpt", "gpt4", "ai"],
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the GPT4o AI.",
  usage: "[prompt]",
  guide: "gpt4o hello?",
  cd: 6,
};

module.exports["run"] = async ({ args, chat, font, event, format, admin }) => {
    
  let uuid = event.senderID;
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  let ask = args.join(" ").replace(urlRegex, "").trim();

  const isAdmin = admin?.includes(uuid);

  if (event.type === "message_reply" && event.messageReply && event.messageReply.attachments && !isAdmin) {
    return chat.reply(font.thin("I'm Sorry, but I can only send modified images to admins!"));
  } else if (event.type === "message_reply" && event.messageReply && event.messageReply.attachments) {
      uuid = randomUUID();
  }

  if (event.type === "message_reply" && event.messageReply.body) {
    ask += `\n\nUser replied with this message: ${event.messageReply.body}`;
  }

  if (event.messageReply && event.messageReply.attachments) {
    const attachments = event.messageReply.attachments;
    const recog_urls = attachments.map((attachment) => attachment.url);
    ask += `\n\nUser also sent these attachments: ${recog_urls.join(", ")}`;
  }

  if (!ask) return chat.reply(font.thin("Please provide a message!"));

  const answering = await chat.reply(font.thin("Generating response..."));

  try {
    const res = await axios.get(
      global.api.hajime +
        `/api/gpt4o?ask=${encodeURIComponent(ask)}&uid=${uuid}`
    );

    answering.unsend();

    if (res.data.images && res.data.images.length > 0) {
      const imageUrls = res.data.images.map((image) => image.url);
      const imageDescriptions = res.data.images
        .map((image, index) => `${index + 1}. ${image.description}`)
        .join("\n\n");

      const attachments = await Promise.all(
        imageUrls.map((url) => chat.arraybuffer(url))
      );
      return chat.reply({ body: imageDescriptions, attachment: attachments });
    }

    chat.reply(format({ title: "GPT-4O FREE", content: res.data.answer, noFormat: true }));
  } catch (error) {
    chat.reply(font.thin(error.stack || error.message));
    answering.unsend();
  }
};