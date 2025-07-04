const axios = require("axios");

let cachedSupportedModels = null;
const userModelMap = {};
const DEFAULT_MODEL = "claude-opus-4-20250514";

module.exports["config"] = {
  name: "claude",
  aliases: ["cl"],
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the claude API to get AI responses.",
  usage: "[model <index>] or [ask]",
  guide:
    "claude hello (uses selected or default model)\nclaude model 1 (switches to model at index 1 for user)",
  cd: 6,
};

async function fetchSupportedModels() {
  try {
    const modelRes = await axios.get(global.api.hajime + "/api/anthropic", {
      params: {
        check_models: true,
      },
    });
    if (modelRes.data && modelRes.data.supported_models) {
      cachedSupportedModels = modelRes.data.supported_models;
    } else {
      cachedSupportedModels = [DEFAULT_MODEL];
    }
  } catch (error) {
    cachedSupportedModels = [DEFAULT_MODEL];
  }
  return cachedSupportedModels;
}

module.exports["run"] = async ({ args, chat, font, event, format }) => {
  let modelIndex = userModelMap[event.senderID] || 0;
  let ask = args.join(" ");
  let isModelSelection = false;
  let recog_urls = "";

  if (args.length > 0 && args[0].toLowerCase() === "model" && !isNaN(args[1])) {
    modelIndex = parseInt(args[1]);
    ask = args.slice(2).join(" ");
    isModelSelection = true;
    userModelMap[event.senderID] = modelIndex;
  }

  if (event.type === "message_reply" && event.messageReply?.body) {
    ask += `\n\nUser replied with this message: ${event.messageReply.body}`;
  }

  if (event.messageReply && event.messageReply.attachments) {
    const attachments = event.messageReply.attachments;
    recog_urls = attachments.map((attachment) => attachment.url);
    ask += `\n\nUser also sent these attachments: ${recog_urls.join(", ")}`;
  }

  if (!ask && !isModelSelection) {
    if (!cachedSupportedModels) {
      await fetchSupportedModels();
    }
    const modelList = cachedSupportedModels
      .map((m, i) => `${i}. ${m}`)
      .join("\n");
    return chat.reply(
      font.thin(
        `Please provide a message or select a model!\nAvailable models:\n${modelList}\n\nCurrent default model: ${DEFAULT_MODEL}`
      )
    );
  }

  const answering = await chat.reply(font.thin("Generating response..."));

  try {
    let modelToUse = DEFAULT_MODEL;

    if (userModelMap[event.senderID] !== undefined) {
      if (!cachedSupportedModels) {
        await fetchSupportedModels();
      }

      if (userModelMap[event.senderID] < cachedSupportedModels.length) {
        modelToUse = cachedSupportedModels[userModelMap[event.senderID]];
      }
    }

    if (isModelSelection && !ask) {
      answering.unsend();
      if (!cachedSupportedModels) {
        await fetchSupportedModels();
      }
      if (modelIndex >= cachedSupportedModels.length) {
        const modelList = cachedSupportedModels
          .map((m, i) => `${i}. ${m}`)
          .join("\n");
        return chat.reply(
          font.thin(
            `Invalid model index ${modelIndex}. Available models:\n${modelList}\n\nCurrent default model: ${DEFAULT_MODEL}`
          )
        );
      }
      return chat.reply(
        font.thin(
          `Model switched to ${modelToUse} (index ${modelIndex}) for your future queries.`
        )
      );
    }

    const apiRes = await axios.post(global.api.hajime + "/api/anthropic", {
      ask: ask,
      img_url: recog_urls,
      uid: event.senderID || "default-user",
      model: modelToUse,
      roleplay: "",
      max_tokens: "",
      stream: false,
    });

    answering.unsend();

    const { answer, model_used } = apiRes.data;
    const responseMessage = format({
      title: model_used
        .split("/")
        .pop()
        .toUpperCase(),
      content: answer,
      noFormat: true,
      contentFont: "none",
    });
    chat.reply(responseMessage);
  } catch (error) {
    answering.unsend();
    chat.reply(font.thin(error.stack || error.message));
  }
};
