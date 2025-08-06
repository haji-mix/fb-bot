const axios = require("axios");
const { randomUUID } = require("crypto");

module.exports["config"] = {
  name: "ai",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara | Aljur Pogoy",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the GPT OSS AI.",
  usage: "[prompt]",
  guide: "ai hello?",
  cd: 6,
};

const handleFollowUp = async ({ event, data, chat, format, uuid }) => {
  try {
    const userReply = event.body || "";
    let followUpAsk = `Previous context: ${data.conversationHistory
      .map((item) => `${item.user} -> ${item.bot}`)
      .join("\n")}\n\nUser replied: ${userReply}`;

    const followUpResponse = await axios.post(
      global.api.hajime + `/api/gptoss`,
      {
        ask: followUpAsk,
        uid: uuid,
        reasoning_effort: "low"
      }
    );

    const newResponse = await chat.reply(
      format({
        title: followUpResponse.data.model_used.toUpperCase(),
        content: followUpResponse.data.answer,
        noFormat: true,
        contentFont: "none",
      })
    );

    data.conversationHistory.push({
      user: userReply,
      bot: followUpResponse.data.answer,
    });

    global.Hajime.replies[newResponse.messageID] = {
      author: event.senderID,
      conversationHistory: data.conversationHistory,
      callback: handleFollowUp,
    };

  } catch (error) {
    chat.reply(`Error: ${error.message}`);
  }
};

module.exports["run"] = async ({ args, chat, font, event, format }) => {
  const uuid = event.senderID;
  let ask = args.join(" ");

  if (event.type === "message_reply" && event.messageReply?.body) {
    ask += `\n\nUser replied with this message: ${event.messageReply.body}`;
  }

  if (!ask) return chat.reply(font.thin("Please provide a message!"));

  const answering = await chat.reply(font.thin("Generating response..."));

  try {
    const res = await axios.post(
      global.api.hajime + `/api/gptoss`,
      {
        ask: ask,
        uid: uuid,
        reasoning_effort: "low"
      }
    );

    answering.unsend();

    const response = await chat.reply(
      format({
        title: res.data.model_used.toUpperCase(),
        content: res.data.answer,
        noFormat: true,
        contentFont: "none",
      })
    );

    global.Hajime.replies[response.messageID] = {
      author: event.senderID,
      conversationHistory: [{ user: ask, bot: res.data.answer }],
      callback: handleFollowUp,
    };

    setTimeout(() => {
      delete global.Hajime.replies[response.messageID];
    }, 300000);

  } catch (error) {
    chat.reply(font.thin(error.stack || error.message));
    answering.unsend();
  }
};