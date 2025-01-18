const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports["config"] = {
  name: "copilot",
  isPrefix: false,
  aliases: ["copilot-chat", "github-copilot", "gcop", "cop"],
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with GitHub Copilot Chat AI coding assitant.",
  usage: "[prompt]",
  guide: "copilot Write a simple REST API in Node.js",
  cd: 6,
};

module.exports["run"] = async ({ chat, args, font }) => {
  const url = "https://api.individual.githubcopilot.com/github/chat/threads/acf58b4f-792b-4c14-b1fa-670b249008a8/messages";
  const headers = {
    "host": "api.individual.githubcopilot.com",
    "cache-control": "max-age=0",
    "sec-ch-ua-platform": "\"Android\"",
    "authorization": "GitHub-Bearer eW6vs2qUnENFC9WZxug2XpFK4-qmdLViqtgH4QGVzy33qh9xJuFTW2iopAyYZB0a7Qjdfb4jXMFStWcGE6Hsf0XSxT9iQu9afgNQ0Pv84oY=",
    "copilot-integration-id": "copilot-chat",
    "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    "sec-ch-ua": "\"Google Chrome\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
    "content-type": "text/event-stream",
    "sec-ch-ua-mobile": "?1",
    "accept": "*/*",
    "origin": "https://github.com",
    "sec-fetch-site": "cross-site",
    "sec-fetch-mode": "cors",
    "sec-fetch-dest": "empty",
    "referer": "https://github.com/",
    "accept-encoding": "gzip, deflate, br, zstd",
    "accept-language": "en-US,en;q=0.9,ru;q=0.8,tr;q=0.7,zh-CN;q=0.6,zh;q=0.5,fil;q=0.4,ar;q=0.3",
    "priority": "u=1, i",
  };

  const query = args.join(" ");
  if (!query) {
    chat.reply(font.monospace("Please provide a prompt!"));
    return;
  }

  const answering = await chat.reply(font.monospace("🕐 | Generating response..."));

  const payload = {
    content: query,
    intent: "conversation",
    references: [],
    streaming: true,
    context: [],
    currentURL: "https://github.com/copilot",
    confirmations: [],
    customInstructions: [],
    model: "gpt-4o",
    mode: "immersive",
    parentMessageID: "",
  };

  try {
    const response = await axios.post(url, payload, { headers });
    if (response.status === 200) {
      let completeMessage = "";
      const dataLines = response.data.split("\n");

    dataLines.forEach(line => {
        if (line.startsWith("data:")) {
          try {
            const json = JSON.parse(line.substring(6));
            if (json.type === "content") {
              completeMessage += json.body;
            }
          } catch (error) {
            console.error("Error parsing JSON:", error.message);
          }
        }
      });

      const codeBlocks = completeMessage.match(/```[\s\S]*?```/g) || [];
      const line = "\n" + "━".repeat(18) + "\n";
      completeMessage = completeMessage.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

      const message = font.bold(" 🤖 | GitHub Copilot") + line + completeMessage + line + font.monospace("◉ USE 'CLEAR' TO RESET CONVERSATION.");

      await answering.edit(message);

      if (codeBlocks.length > 0) {
        const allCode = codeBlocks.map(block => block.replace(/```/g, "").trim()).join("\n\n\n");
        const cacheFolderPath = path.join(__dirname, "cache");

        if (!fs.existsSync(cacheFolderPath)) {
          fs.mkdirSync(cacheFolderPath);
        }

        const uniqueFileName = `code_snippet_${Math.floor(Math.random() * 1e6)}.txt`;
        const filePath = path.join(cacheFolderPath, uniqueFileName);

        fs.writeFileSync(filePath, allCode, "utf8");

        const fileStream = fs.createReadStream(filePath);
        await chat.reply({ attachment: fileStream });

        fs.unlinkSync(filePath);
      }
    } else {
      await answering.edit(font.monospace(`Request failed with status code ${response.status}`));
    }
  } catch (error) {
    await answering.edit(font.monospace(`Error: ${error.message}`));
  }
};
