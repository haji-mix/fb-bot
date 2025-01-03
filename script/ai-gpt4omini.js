
const axios = require('axios');

module.exports["config"] = {
  name: "omni",
  aliases: ["omini"],
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with GPT-4o, an OpenAI GPT-4 model.",
  usage: "[prompt]",
  guide: "gpt4o Explain quantum computing in simple terms.",
  cd: 6
};

const conversationHistories = {};

class Chat {
  constructor(model, statusUrl, chatUrl) {
    this.model = model;
    this.statusUrl = statusUrl;
    this.chatUrl = chatUrl;
    this.messages = [];
    this.oldVqd = '';
    this.newVqd = '';
  }

  async init() {
    try {
      const response = await axios.get(this.statusUrl, {
        headers: { 'x-vqd-accept': '1' }
      });
      this.newVqd = response.headers['x-vqd-4'];
      if (!this.newVqd) {
        throw new Error('Failed to initialize chat. No VQD token found.');
      }
    } catch (error) {
      throw new Error(`Initialization error: ${error.message}`);
    }
  }

  async fetch(content) {
    this.messages.push({ role: 'user', content });
    const payload = {
      model: this.model,
      messages: this.messages,
    };

    try {
      const response = await axios.post(this.chatUrl, payload, {
        headers: { 'x-vqd-4': this.newVqd, 'Content-Type': 'application/json' },
        responseType: 'stream',
      });
      return response;
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }

  async fetchFull(content) {
    await this.init();
    const response = await this.fetch(content);
    let buffer = '';
    let finalMessage = '';

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        buffer += chunk.toString();

        let endIndex;
        while ((endIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, endIndex).trim();
          buffer = buffer.slice(endIndex + 1);

          if (line === '[DONE]') break;

          if (line.startsWith('data: ')) {
            const jsonString = line.slice(6).trim();

            if (jsonString && jsonString !== '[DONE]') {
              try {
                const data = JSON.parse(jsonString);
                if (data.message) {
                  finalMessage += data.message;
                }
              } catch (err) {
                console.error('Error parsing chunk:', err);
              }
            }
          }
        }
      });

      response.data.on('end', () => {
        if (buffer.trim() !== '') {
          try {
            const data = JSON.parse(buffer);
            if (data.message) {
              finalMessage += data.message;
            }
          } catch (err) {
            console.error('Error parsing remaining buffer:', err);
          }
        }
        this.oldVqd = this.newVqd;
        this.newVqd = response.headers['x-vqd-4'];
        resolve(finalMessage);
      });

      response.data.on('error', (err) => {
        reject(err);
      });
    });
  }
}

module.exports["run"] = async ({ chat, args, event, font, global }) => {
  const { url, models } = global.api.workers.duckgo;
  const { threadID, senderID } = event;
  
  const statusUrl = url[0];
  const chatUrl = url[1];
  const query = args.join(" ");
  const model = models[2];

  if (!query) {
    chat.reply(font.thin("Please provide a question!"));
    return;
  }

  conversationHistories[senderID] = conversationHistories[senderID] || [];
  conversationHistories[senderID].push({ role: "user", content: query });

//  const answering = await chat.reply(font.monospace("🕐 | GPT-4o is Typing..."));
  const chatInstance = new Chat(model, statusUrl, chatUrl);

  try {
    const response = await chatInstance.fetchFull(query);
    const cleanup = response.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));
    conversationHistories[senderID].push({ role: "assistant", content: response });

    const message = font.bold(" 🤖 | " + model.split('/').pop().toUpperCase()) + "\n" + '━'.repeat(18) + "\n" + cleanup + "\n" + '━'.repeat(18)
    chat.reply(message);
 //   answering.edit(message);
  } catch (error) {
  //  answering.edit(font.monospace("Failed to retrieve response from GPT-4o: " + error.message));
  chat.reply(font.thin(error.message));
  }
};

