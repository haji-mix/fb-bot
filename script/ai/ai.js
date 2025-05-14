const axios = require("axios");
const { randomUUID } = require('crypto');

module.exports.config = {
  name: "gpt4o",
  aliases: ["gpt", "gpt4", "ai"],
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with GPT4o AI",
  usage: "[prompt]",
  cd: 6
};

async function fetchAIResponse(prompt, uuid, sessionID, chat, font) {
  try {
    const res = await axios.get(
      `${global.api.hajime}/api/gpt4o?ask=${encodeURIComponent(prompt)}&uid=${uuid}&sessionID=${sessionID}`
    );
    return res.data;
  } catch (error) {
    await chat.reply(font.thin(error.stack || error.message));
    return null;
  }
}

async function processResponse(data, chat, format, session) {
  if (!data) return;

  if (data.images?.length) {
    const attachments = await Promise.all(data.images.map(img => chat.arraybuffer(img.url)));
    const descriptions = data.images.map((img, i) => `${i + 1}. ${img.description}`).join("\n\n");
    const msg = await chat.reply({ body: descriptions, attachment: attachments });
    session.sentMessages.push(msg);
    session.lastMessage = msg;
    return;
  }

  const msg = await chat.reply(format({ title: "GPT-4O FREE", content: data.answer, noFormat: true, contentFont: 'none' }));
  session.sentMessages.push(msg);
  session.lastMessage = msg;
}

async function handlePrompt({ prompt, uuid, session, chat, font, format, isBotReply }) {
  const mono = txt => font.thin(txt);

  if (!prompt && !isBotReply) {
    const msg = await chat.reply(mono("Please provide a message!"));
    session.sentMessages.push(msg);
    session.lastMessage = msg;
    return;
  }

  const answering = await chat.reply(mono("Generating response..."));
  session.sentMessages.push(answering);

  const data = await fetchAIResponse(prompt, uuid, session.sessionID, chat, font);
  await answering.unsend();
  session.sentMessages = session.sentMessages.filter(msg => msg !== answering);

  await processResponse(data, chat, format, session);
}

module.exports.run = async ({ args, chat, font, event, format, utils }) => {

  if (!utils.handleReply) {
    utils.handleReply = [];
  }

  const uuid = event.senderID;

  let session = utils.handleReply.find(r => r.author === uuid) || {
    type: "gpt4o_conversation",
    sessionID: randomUUID(),
    sentMessages: [],
    author: uuid,
    lastActive: Date.now()
  };
  
  if (!utils.handleReply.includes(session)) {
    utils.handleReply.push(session);
  }
  session.lastActive = Date.now();

  let prompt = args.join(" ");
  const isBotReply = event.type === "message_reply" && event.messageReply.senderID === chat.botID;
  if (isBotReply) prompt = args.join(" ");
  if (event.messageReply?.attachments) {
    prompt += `\n\nAttachments: ${event.messageReply.attachments.map(a => a.url).join(", ")}`;
  }

  await handlePrompt({ prompt, uuid, session, chat, font, format, isBotReply });

  if (!utils.cleanupInterval) {
    utils.cleanupInterval = setInterval(() => {
      if (!utils.handleReply) return;
      const timeout = 5 * 60 * 1000;
      utils.handleReply = utils.handleReply.filter(session => {
        if (Date.now() - session.lastActive > timeout) {
          session.sentMessages.forEach(msg => msg.unsend());
          return false;
        }
        return true;
      });
    }, 60 * 1000); 
  }
};

module.exports.handleReply = async ({ chat, event, font, format, utils }) => {
  const { senderID, body } = event;
  const session = utils.handleReply?.find(r => r.author === senderID && r.type === "gpt4o_conversation");
  if (!session || event.type !== "message_reply" || event.messageReply.senderID !== chat.botID) return;

  await Promise.all(session.sentMessages.map(msg => msg.unsend()));
  session.sentMessages = [];

  const prompt = body.trim();
  await handlePrompt({ prompt, uuid: senderID, session, chat, font, format, isBotReply: true });
};