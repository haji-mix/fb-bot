const axios = require('axios');

const userModelMap = new Map();
const userQualityMap = new Map();

module.exports["config"] = {
  name: "lc",
  isPrefix: false,
  version: "1.0.0",
  credits: "Kenneth Panio",
  role: 0,
  type: "artificial-intelligence",
  info: "Interact with LlamaCoder Together.AI with model and quality selection.",
  usage: "[model] [value/quality]/[prompt]",
  guide: "lc model [number]\nlc quality [low/high]\nllamacoder [prompt]",
  cd: 6
};

const availableModels = [
  "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
  "deepseek-ai/DeepSeek-V3",
  "Qwen/Qwen2.5-Coder-32B-Instruct"
];
const availableQualities = ["low", "high"];

module.exports["run"] = async ({ chat, args, event, font }) => {
  const { senderID } = event;

  if (args[0]?.toLowerCase() === "model" && !isNaN(args[1])) {
    const modelIndex = parseInt(args[1]) - 1;
    if (modelIndex < 0 || modelIndex >= availableModels.length) {
      chat.reply(font.thin(`Invalid model number. Choose 1-${availableModels.length}.`));
      return;
    }
    userModelMap.set(senderID, modelIndex);
    chat.reply(font.bold(`✅ Switched to model: ${availableModels[modelIndex]}`));
    return;
  }

  if (args[0]?.toLowerCase() === "quality" && availableQualities.includes(args[1]?.toLowerCase())) {
    userQualityMap.set(senderID, args[1].toLowerCase());
    chat.reply(font.bold(`✅ Quality set to: ${args[1]}`));
    return;
  }

  if (args.length === 0) {
    const modelList = availableModels.map((m, i) => `${i + 1}. ${m.split('/').pop()}`).join("\n");
    chat.reply(
      font.bold("🤖 | Available Models & Quality Levels\n") +
      font.thin(`${modelList}\nQualities: ${availableQualities.join(", ")}\n\nTo switch models, use: lc model [number]\nExample: lc model 2\nTo adjust quality use: lc low or high\nTo chat use: lc [prompt]`)
    );
    return;
  }

  const selectedModel = availableModels[userModelMap.get(senderID) ?? 0];
  const selectedQuality = userQualityMap.get(senderID) ?? "low";
  const query = args.join(" ");

  const answering = await chat.reply(font.thin(`🕐 | ${selectedModel.split('/').pop()} is Typing...`));

  try {
    const firstHeaders = {
  'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
  'next-router-state-tree': '%5B%22%22%2C%7B%22children%22%3A%5B%22(main)%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2C%22%2F%22%2C%22refresh%22%5D%7D%5D%7D%2Cnull%2Cnull%2Ctrue%5D',
  'sec-ch-ua-mobile': '?1',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
  'content-type': 'text/plain;charset=UTF-8',
  'accept': 'text/x-component',
  'next-action': '78feb8d885f31503bb4032395dfc2f3df9d3135e11',
  'sec-ch-ua-platform': '"Android"',
  'origin': 'https://llamacoder.together.ai',
  'sec-fetch-site': 'same-origin',
  'sec-fetch-mode': 'cors',
  'sec-fetch-dest': 'empty',
  'referer': 'https://llamacoder.together.ai/',
  'accept-language': 'en-US,en;q=0.9'
};

    const firstData = JSON.stringify([`You're an Together.ai Copilot code assistant an expert in frontend you're only allowed to make website in single html but you can't separate js or css you only mixed them together you can use any multiple frameworks to make the web responsive and more cleaner and cool design. here's my ask: '` + query, selectedModel, selectedQuality, "$undefined"]);
    const firstResponse = await axios.post('https://llamacoder.together.ai/', firstData, { headers: firstHeaders });

    const lastMessageIdMatch = firstResponse.data.match(/"lastMessageId":"([^"]+)"/);
    if (!lastMessageIdMatch) {
      throw new Error("Failed to extract lastMessageId.");
    }
    const lastMessageId = lastMessageIdMatch[1];

const secondHeaders = {
        'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
        'sec-ch-ua-platform': '"Android"',
        'sec-ch-ua-mobile': '?1',
        'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
        'content-type': 'text/plain;charset=UTF-8',
        'accept': '*/*',
        'origin': 'https://llamacoder.together.ai',
        'sec-fetch-site': 'same-origin',
        'sec-fetch-mode': 'cors',
        'sec-fetch-dest': 'empty',
        'referer': 'https://llamacoder.together.ai/',
        'accept-language': 'en-US,en;q=0.9'
      };

    const secondData = { messageId: lastMessageId, model: selectedModel };
    const secondResponse = await axios.post(
      'https://llamacoder.together.ai/api/get-next-completion-stream-promise',
      secondData,
      { headers: secondHeaders, responseType: 'stream' }
    );

    let buffer = "";
    let content = "";

    secondResponse.data.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();

      lines.forEach(line => {
        if (line.trim() === "") return;
        try {
          const parsed = JSON.parse(line);
          if (parsed.choices && parsed.choices.length > 0) {
            content += parsed.choices[0].delta.content || "";
          }
        } catch (e) {
          console.error('Error parsing line:', e);
          console.error('Problematic line:', line);
        }
      });
    });

    await new Promise((resolve, reject) => {
      secondResponse.data.on('end', resolve);
      secondResponse.data.on('error', reject);
    });
    
    const line = "\n" + '━'.repeat(18) + "\n";

     answering.edit(font.bold(`🤖 | ${selectedModel.split('/').pop().toUpperCase()}`) + line + content + line);
     
     const codeBlocks = content.match(/```[\s\S]*?```/g) || [];
     
                if (codeBlocks.length > 0) {
    const isHtml = codeBlocks.some(block => /<html[\s>]/i.test(block) || /<!DOCTYPE html>/i.test(block));

    if (isHtml) {
        const allCode = codeBlocks
            .map(block => block.replace(/^```[a-zA-Z]+\s*[^\n]*\n/, '').replace(/```$/, '').trim())
            .join("\n\n\n");
            
            const uitocode = "https://codetoui.onrender.com";

        try {
            const response = await axios.post(uitocode + "/submit-html", {
                htmlContent: allCode
            }, {
                headers: { "Content-Type": "application/json" }
            });

            const result = response.data;
            const shortUrl = await chat.shorturl(uitocode + result.url);
            const screenshot = await chat.stream(`https://image.thum.io/get/width/1920/crop/400/fullpage/noanimate/${shortUrl}`);

            chat.reply({ body: shortUrl, attachment: screenshot });
        } catch (error) {
            console.error("Error submitting HTML:", error);
        }
    }
}
  } catch (error) {
     answering.edit(font.thin(error.message));
  }
};
