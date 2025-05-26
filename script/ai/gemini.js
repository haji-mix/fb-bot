const axios = require("axios");

let cachedSupportedModels = null;
const userModelMap = {};
const DEFAULT_MODEL = "gemini-1.5-flash"; // Default model name

module.exports["config"] = {
  name: "gemini",
  isPrefix: false,
  aliases: ["gm"],
  version: "1.0.0",
  credits: "Kenneth Panio | Liane Cagara",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the Gemini API to get AI responses.",
  usage: "[model <index>] or [ask]",
  guide:
    "gemini hello (uses selected or default model)\ngemini model 1 (switches to model at index 1 for user)",
  cd: 6,
};

async function fetchSupportedModels() {
  try {
    const modelRes = await axios.post(global.api.hajime + "/api/gemini", {
      check_models: true
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

module.exports["run"] = async ({ args, chat, event, format }) => {
  let modelIndex = userModelMap[event.senderID] || 0;
  let ask = args.join(" ");
  let isModelSelection = false;
  let fileUrl = ""; // To store single attachment URL

  if (args.length > 0 && args[0].toLowerCase() === "model" && !isNaN(args[1])) {
    modelIndex = parseInt(args[1]);
    ask = args.slice(2).join(" ");
    isModelSelection = true;
    userModelMap[event.senderID] = modelIndex;
  }

  if (event.type === "message_reply" && event.messageReply.body) {
    ask += `\n\nUser replied with this message: ${event.messageReply.body}`;
  }

  if (event.messageReply && event.messageReply.attachments) {
    const attachmentCount = event.messageReply.attachments.length;
    if (attachmentCount > 1) {
      return chat.reply("I can only process a single image.");
    }
    if (attachmentCount === 1) {
      fileUrl = event.messageReply.attachments[0].url;
    }
  }

  if (!ask && !isModelSelection) {
    if (!cachedSupportedModels) {
      await fetchSupportedModels();
    }
    const modelList = cachedSupportedModels
      .map((m, i) => `${i}. ${m}`)
      .join("\n");
    return chat.reply(
      `Please provide a message or select a model!\nAvailable models:\n${modelList}\n\nCurrent default model: ${DEFAULT_MODEL}`
    );
  }

  const answering = await chat.reply("Generating response...");

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
          `Invalid model index ${modelIndex}. Available models:\n${modelList}\n\nCurrent default model: ${DEFAULT_MODEL}`
        );
      }
      return chat.reply(
        `Model switched to ${modelToUse} (index ${modelIndex}) for your future queries.`
      );
    }

    const apiRes = await axios.post(global.api.hajime + "/api/gemini", {
      ask: ask,
      uid: event.senderID || "default-user",
      model: modelToUse,
      roleplay: "You're Gemini AI Assistant",
      google_api_key: "", // Add API key if required
      file_url: fileUrl, // Pass single attachment URL
      max_tokens: ""
    });

    answering.unsend();

    const { answer, model_used } = apiRes.data;
    const responseMessage = format({ 
      title: model_used.toUpperCase(), 
      content: answer, 
      noFormat: true, 
      contentFont: 'none' 
    });
    chat.reply(responseMessage);
  } catch (error) {
    answering.unsend();
    chat.reply(error.message || "An error occurred while processing your request.");
  }
};