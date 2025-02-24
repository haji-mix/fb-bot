const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "mistral",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with Mistral AI. Switch between models dynamically.",
  usage: "[model] [number]/[prompt]",
  guide: "mistral [model] [number]/[prompt]\nExample: mistral model 2\nExample: mistral What is AI?",
  cd: 6
};

// Store user-specific model selections
const userModelMap = new Map();

// Store conversation histories for each user
const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, key, models } = global.api.workers;
  const { threadID, senderID } = event;

  // Fetch available Mistral models
  const mistralModels = models.mistral;

  if (!mistralModels || mistralModels.length < 1) {
    chat.reply(font.thin("No models available. Please check the configuration."));
    return;
  }

  const defaultModelIndex = 3; // Default to the first model
  const defaultModel = mistralModels[defaultModelIndex];

  // Check if the user is switching models
  const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

  if (isSwitchingModel) {
    const modelNumber = parseInt(args[1]) - 1; // Convert to zero-based index
    if (modelNumber < 0 || modelNumber >= mistralModels.length) {
      chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${mistralModels.length}.`));
      return;
    }

    // Save the selected model for the user
    userModelMap.set(senderID, modelNumber);
    const modelName = mistralModels[modelNumber].split('/').pop();
    chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
    return;
  }

  // Get the selected model for the user (or default if not set)
  const selectedModelIndex = userModelMap.get(senderID) ?? defaultModelIndex;
  const selectedModel = mistralModels[selectedModelIndex];
  const modelName = selectedModel.split('/').pop().toUpperCase();

  // Handle clearing conversation history
  if (['clear', 'reset', 'forgot', 'forget'].includes(args[0]?.toLowerCase())) {
    conversationHistories[senderID] = [];
    chat.reply(font.thin("Conversation history cleared."));
    return;
  }

  // Handle empty prompt
  if (args.length === 0) {
    const modelList = mistralModels.map((model, index) => `${index + 1}. ${model.split('/').pop()}`).join('\n');
    chat.reply(
      font.bold("🤖 | Available Models:\n") +
      font.thin(modelList +
      "\n\nTo switch models, use: mistral model [number]\nExample: mistral model 2\nTo chat use: mistral [prompt]"
    ));
    return;
  }

  // Join the remaining arguments as the user's query
  const query = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

  // Notify the user that the bot is typing
  const answering = await chat.reply(font.thin(`🕐 | ${modelName} is Typing...`));

  // Initialize conversation history if it doesn't exist
  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

  // Function to get a response from the API
  const getResponse = async () => {
    return axios.post(url + selectedModel, {
      messages: conversationHistories[senderID],
      max_tokens: 512
    }, {
      headers: {
        'Authorization': 'Bearer ' + atob(key),
        'Content-Type': 'application/json',
        'User-Agent': randomUseragent.getRandom()
      }
    });
  };

  // Retry mechanism for API requests
  const maxRetries = 3;
  let attempts = 0;
  let success = false;
  let answer = "Under Maintenance!\n\nPlease use other models. Type 'help' to get started.";

  while (attempts < maxRetries && !success) {
    try {
      const response = await getResponse();
      answer = response.data.result.response;
      success = true;
    } catch (error) {
      attempts++;
      if (attempts < maxRetries) {
        await answering.edit(font.thin(`No response from ${modelName}. Retrying... (${attempts} of ${maxRetries} attempts)`));
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      } else {
        await answering.edit(font.thin(`No response from ${modelName}. Please try again later: ${error.message}`));
        return;
      }
    }
  }

  // If successful, update conversation history and send the response
  if (success) {
    conversationHistories[senderID].push({ role: "assistant", content: answer });

    // Format the response
    const line = "\n" + '━'.repeat(18) + "\n";
    answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    const message = font.bold(`🤖 | ${modelName}`) + line + answer + line + font.thin(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

    answering.edit(message);

  }
};