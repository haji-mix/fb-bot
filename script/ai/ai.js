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

async function fetchAIResponse(ask, uuid, sessionID, chat, font) {
  try {
    const res = await axios.get(
      global.api.hajime +
        `/api/gpt4o?ask=${encodeURIComponent(ask)}&uid=${uuid}&sessionID=${sessionID}`
    );
    return res.data;
  } catch (error) {
    await chat.reply(font.thin(error.stack || error.message));
    return null;
  }
}

module.exports["run"] = async ({ args, chat, font, event, format, admin, Utils }) => {
  const uuid = event.senderID;
  let ask = args.join(" ");
  const isAdmin = admin?.includes(uuid);
  const mono = txt => font.thin(txt);

  if (!Utils.handleReply) {
    Utils.handleReply = [];
  }

  let handleReply = Utils.handleReply.find(reply => reply.author === uuid);
  if (!handleReply) {
    handleReply = {
      type: "gpt4o_conversation",
      sessionID: randomUUID(),
      sentMessages: [],
      author: uuid,
      lastActive: Date.now(),
    };
    Utils.handleReply.push(handleReply);
  }

  handleReply.lastActive = Date.now();

  const isReplyToBot = event.type === "message_reply" && event.messageReply.senderID === chat.botID;

  if (!ask && !isReplyToBot) {
    const msg = await chat.reply(mono("Please provide a message!"));
    handleReply.sentMessages.push(msg);
    handleReply.lastMessage = msg;
    return;
  }

  if (isReplyToBot && event.messageReply.body) {
    ask = args.join(" ");
  }

  if (event.messageReply && event.messageReply.attachments) {
    const attachments = event.messageReply.attachments;
    const recog_urls = attachments.map((attachment) => attachment.url);
    ask += `\n\nUser also sent these attachments: ${recog_urls.join(", ")}`;
  }

  const answering = await chat.reply(mono("Generating response..."));
  handleReply.sentMessages.push(answering);

  const data = await fetchAIResponse(ask, uuid, handleReply.sessionID, chat, font);

  await answering.unsend();
  handleReply.sentMessages = handleReply.sentMessages.filter(msg => msg !== answering);

  if (!data) return;

  if (data.images && data.images.length > 0) {
    const imageUrls = data.images.map((image) => image.url);
    const imageDescriptions = data.images
      .map((image, index) => `${index + 1}. ${image.description}`)
      .join("\n\n");

    const attachments = await Promise.all(
      imageUrls.map((url) => chat.arraybuffer(url))
    );
    const msg = await chat.reply({ body: imageDescriptions, attachment: attachments });
    handleReply.sentMessages.push(msg);
    handleReply.lastMessage = msg;
    return;
  }

  const msg = await chat.reply(format({ title: "GPT-4O FREE", content: data.answer, noFormat: true, contentFont: 'none' }));
  handleReply.sentMessages.push(msg);
  handleReply.lastMessage = msg;
};

module.exports["handleReply"] = async ({ chat, event, font, format, Utils }) => {
  const { senderID, body } = event;
  const mono = txt => font.thin(txt);

  let handleReply = Utils.handleReply.find(reply => reply.author === senderID);
  if (!handleReply || handleReply.type !== "gpt4o_conversation") {
    return;
  }

  const isReplyToBot = event.type === "message_reply" && event.messageReply.senderID === chat.botID;
  if (!isReplyToBot) {
    return;
  }

  const unsendAllMessages = async () => {
    for (const msg of handleReply.sentMessages) {
      await msg.unsend();
    }
    handleReply.sentMessages = [];
  };
  await unsendAllMessages();

  const args = body.trim().split(" ");
  if (!args.length) {
    const msg = await chat.reply(mono("Please provide a message!"));
    handleReply.sentMessages.push(msg);
    handleReply.lastMessage = msg;
    return;
  }

  handleReply.lastActive = Date.now();

  const ask = args.join(" ");
  const answering = await chat.reply(mono("Generating response..."));
  handleReply.sentMessages.push(answering);

  const data = await fetchAIResponse(ask, senderID, handleReply.sessionID, chat, font);

  await answering.unsend();
  handleReply.sentMessages = handleReply.sentMessages.filter(msg => msg !== answering);

  if (!data) return;

  if (data.images && data.images.length > 0) {
    const imageUrls = data.images.map((image) => image.url);
    const imageDescriptions = data.images
      .map((image, index) => `${index + 1}. ${image.description}`)
      .join("\n\n");

    const attachments = await Promise.all(
      imageUrls.map((url) => chat.arraybuffer(url))
    );
    const msg = await chat.reply({ body: imageDescriptions, attachment: attachments });
    handleReply.sentMessages.push(msg);
    handleReply.lastMessage = msg;
    return;
  }

  const msg = await chat.reply(format({ title: "GPT-4O FREE", content: data.answer, noFormat: true, contentFont: 'none' }));
  handleReply.sentMessages.push(msg);
  handleReply.lastMessage = msg;
};

setInterval(() => {
  if (!Utils.handleReply) return;
  const timeout = 5 * 60 * 1000;
  const now = Date.now();
  Utils.handleReply = Utils.handleReply.filter(session => {
    if (now - session.lastActive > timeout) {
      session.sentMessages.forEach(msg => msg.unsend());
      return false;
    }
    return true;
  });
}, 60 * 1000);