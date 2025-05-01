const axios = require("axios");

let cachedSupportedModels = null;
const userModelMap = {};
const DEFAULT_MODEL = "scira-default";

module.exports["config"] = {
  name: "xai",
  isPrefix: false,
  aliases: ["ai", "xai-ai"],
  version: "1.0.4",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with the xAI API to get AI responses.",
  usage: "[model <index>] or [ask]",
  guide:
    "xai hello (uses selected or default model)\nxai model 1 (switches to model at index 1 for user)",
  cd: 6,
};

async function fetchSupportedModels() {
  try {
    const modelRes = await axios.get(global.api.hajime + `/api/xai`);
  } catch (error) {
    if (
      error.response &&
      error.response.status === 400 &&
      error.response.data.supported_models
    ) {
      cachedSupportedModels = error.response.data.supported_models || [DEFAULT_MODEL];
    } else {
      cachedSupportedModels = [DEFAULT_MODEL];
    }
  }
  return cachedSupportedModels;
}

module.exports["run"] = async ({ args, chat, font, event }) => {
  let modelIndex = userModelMap[event.senderID] || 0;
  let ask = args.join(" ");
  let isModelSelection = false;

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
    const attachments = event.messageReply.attachments;
    const recog_urls = attachments.map((attachment) => attachment.url);
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
        `Please provide a message or select a model!\nAvailable models:\n${modelList}`
      )
    );
  }

  const answering = await chat.reply(font.thin("Generating response..."));

  try {
    let modelToUse = DEFAULT_MODEL; // Start with default model
    
    // Only consider fetched models if user has explicitly selected one
    if (userModelMap[event.senderID] !== undefined) {
      if (!cachedSupportedModels) {
        await fetchSupportedModels();
      }
      // If user has selected a model and it exists, use it
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
            `Invalid model index ${modelIndex}. Available models:\n${modelList}`
          )
        );
      }
      return chat.reply(
        font.thin(
          `Model switched to ${modelToUse} (index ${modelIndex}) for your future queries.`
        )
      );
    }

    const apiRes = await axios.get(global.api.hajime + `/api/xai`, {
      params: {
        ask: ask,
        uid: event.senderID || "default-user",
        model: modelToUse,
        group: "web",
        roleplay: "",
      },
    });

    answering.unsend();

    const { answer, model_used } = apiRes.data;
    let responseMessage = `${answer}\n\nModel used: ${model_used}`;

    if (
      apiRes.data.search_results &&
      apiRes.data.search_results.some(
        (result) => result.images && result.images.length > 0
      )
    ) {
      const images = apiRes.data.search_results.flatMap(
        (result) => result.images || []
      );
      const imageUrls = images.map((image) => image.url);
      const imageDescriptions = images
        .map((image, index) => `${index + 1}. ${image.description}`)
        .join("\n\n");

      const attachments = await Promise.all(
        imageUrls.map((url) => chat.stream(url))
      );
      responseMessage += `\n\nImages:\n${imageDescriptions}`;
      return chat.reply({ body: responseMessage, attachment: attachments });
    }

    chat.reply(responseMessage);
  } catch (error) {
    answering.unsend();
    chat.reply(font.thin(error.stack || error.message));
  }
};