const axios = require("axios");
const { randomUUID } = require("crypto");

module.exports["config"] = {
  name: "gpt4o",
  isPrefix: false,
  aliases: ["gpt", "gpt4", "ai"],
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara | Aljur Pogoy",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the GPT4o AI.",
  usage: "[prompt]",
  guide: "gpt4o hello?",
  cd: 6,
};

const handleFollowUp = async ({ api, event, data, chat, format, uuid }) => {
  try {
    const userReply = event.body || "";
    let followUpAsk = `Previous context: ${data.conversationHistory
      .map((item) => `${item.user} -> ${item.bot}`)
      .join("\n")}\n\nUser replied: ${userReply}`;
    if (event.attachments) {
      const attachUrls = event.attachments.map((a) => a.url).join(", ");
      followUpAsk += `\n\nUser also sent these attachments: ${attachUrls}`;
    }

    const followUpResponse = await axios.get(
      global.api.hajime +
        `/api/gpt4o?ask=${encodeURIComponent(followUpAsk)}&uid=${uuid}`
    );

    if (followUpResponse.data.images && followUpResponse.data.images.length > 0) {
      const newImageUrls = followUpResponse.data.images.map((image) => image.url);
      const newImageDescriptions = followUpResponse.data.images
        .map((image, index) => `${index + 1}. ${image.description}`)
        .join("\n\n");
      const newAttachments = await Promise.all(
        newImageUrls.map((url) => chat.arraybuffer(url))
      );
      const newResponse = await chat.reply({
        body: newImageDescriptions,
        attachment: newAttachments,
      });
      data.conversationHistory.push({
        user: userReply,
        bot: newImageDescriptions,
      });
      global.Hajime.replies[newResponse.messageID] = {
        author: event.senderID,
        conversationHistory: data.conversationHistory,
        callback: handleFollowUp, 
      };
    } else {
      const newResponse = await chat.reply(
        format({
          title: "GPT-4O FREE",
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
    }
  } catch (error) {
    chat.reply(`Error: ${error.message}`);
  }
};

module.exports["run"] = async ({ args, chat, font, event, format }) => {
  const uuid = event.senderID;
  let ask = args.join(" ");

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
      global.api.hajime + `/api/gpt4o?ask=${encodeURIComponent(ask)}&uid=${uuid}`
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
      const response = await chat.reply({
        body: imageDescriptions,
        attachment: attachments,
      });
      global.Hajime.replies[response.messageID] = {
        author: event.senderID,
        conversationHistory: [{ user: ask, bot: imageDescriptions }],
        callback: handleFollowUp,
      };
      setTimeout(() => {
        delete global.Hajime.replies[response.messageID];
      }, 300000);
    } else {
      const response = await chat.reply(
        format({
          title: "GPT-4O FREE",
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
    }
  } catch (error) {
    chat.reply(font.thin(error.stack || error.message));
    answering.unsend();
  }
};
