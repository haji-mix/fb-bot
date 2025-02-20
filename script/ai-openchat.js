const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
  name: "openchat",
  aliases: ["oc","ochat"],
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with OpenChat AI. Switch between models dynamically.",
  usage: "[model] [number]/[prompt]",
  guide: "openchat [model] [number]/[prompt]\nExample: openchat model 2\nExample: openchat What is AI?",
  cd: 6
};

// Store user-specific model selections
const userModelMap = new Map();

// Store conversation histories for each user
const conversationHistories = {};

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, key, models } = global.api.workers;

  // Fetch available OpenChat models
  const openchatModels = models.openchat;

  if (!openchatModels || openchatModels.length < 1) {
    chat.reply(font.thin("No models available. Please check the configuration."));
    return;
  }

  const defaultModelIndex = 0; // Default to the first model
  const defaultModel = openchatModels[defaultModelIndex];

  // Check if the user is switching models
  const isSwitchingModel = args[0]?.toLowerCase() === "model" && !isNaN(args[1]);

  if (isSwitchingModel) {
    const modelNumber = parseInt(args[1]) - 1; // Convert to zero-based index
    if (modelNumber < 0 || modelNumber >= openchatModels.length) {
      chat.reply(font.thin(`Invalid model number. Please choose a number between 1 and ${openchatModels.length}.`));
      return;
    }

    // Save the selected model for the user
    userModelMap.set(event.senderID, modelNumber);
    const modelName = openchatModels[modelNumber].split('/').pop();
    chat.reply(font.bold(`✅ | Switched to model: ${modelName}`));
    return;
  }

  // Get the selected model for the user (or default if not set)
  const selectedModelIndex = userModelMap.get(event.senderID) ?? defaultModelIndex;
  const selectedModel = openchatModels[selectedModelIndex];
  const modelName = selectedModel.split('/').pop().toUpperCase();

  // Initialize conversation history for the sender
  if (!conversationHistories[event.senderID]) {
    conversationHistories[event.senderID] = [];
  }

  const history = conversationHistories[event.senderID];

  // Handle 'clear', 'reset', etc., to clear history
  if (['clear', 'reset', 'forgot', 'forget'].includes(args[0]?.toLowerCase())) {
    conversationHistories[event.senderID] = [];
    chat.reply(font.thin("Conversation history cleared."));
    return;
  }

  // Handle empty prompt
  if (args.length === 0) {
    const modelList = openchatModels.map((model, index) => `${index + 1}. ${model.split('/').pop()}`).join('\n');
    chat.reply(
      font.bold("🤖 | Available Models:\n") +
      font.thin(modelList +
      "\n\nTo switch models, use: openchat model [number]\nExample: openchat model 2\nTo chat use: openchat [prompt]"
    ));
    return;
  }

  // Join the remaining arguments as the user's query
  let query = args.join(" ");
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

  // Notify the user that the bot is typing
  const answering = await chat.reply(font.thin(`🕐 | ${modelName} is Typing...`));

  // Add the user query to history
  history.push({ role: "user", content: query });

  // Function to get a response from the API
  const getResponse = async () => {
    return axios.post(url + selectedModel, {
      messages: history,
      max_tokens: 32000
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
    history.push({ role: "assistant", content: answer });

    // Format the response
    const line = "\n" + '━'.repeat(18) + "\n";
    const formattedAnswer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

    const message = font.bold(`🤖 | ${modelName}`) + line + formattedAnswer + line + font.thin(`◉ USE "CLEAR" TO RESET CONVERSATION.`);

    await answering.edit(message);

    // Handle code blocks in the response
    const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
    if (codeBlocks.length > 0) {
      const allCode = codeBlocks.map(block => block.replace(/```/g, '').trim()).join('\n\n\n');
      const cacheFolderPath = path.join(__dirname, "cache");

      if (!fs.existsSync(cacheFolderPath)) {
        fs.mkdirSync(cacheFolderPath);
      }

      const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
      const filePath = path.join(cacheFolderPath, uniqueFileName);

      fs.writeFileSync(filePath, allCode, 'utf8');

      const fileStream = fs.createReadStream(filePath);
      await chat.reply({ attachment: fileStream });

      fs.unlinkSync(filePath);
    }
  }
};