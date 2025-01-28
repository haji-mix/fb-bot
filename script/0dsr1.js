const axios = require("axios");

module.exports["config"] = {
    name: "deepseek",
    aliases: ["ds"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    isPrefix: true,
    type: "artificial-intelligence",
    info: "Interact with DeepSeek AI with streaming support.",
    usage: "[prompt]",
    guide: "deepseek [prompt]",
    cd: 8
};

let searchEnabled = false;
let thinkingEnabled = false;

module.exports["run"] = async ({ chat, args, event, font }) => {
    const mono = (txt) => font.monospace(txt);
    const query = args.join(" ");

    if (query.toLowerCase() === "toggle") {
        searchEnabled = !searchEnabled;
        return chat.reply(mono(`Search mode has been ${searchEnabled ? "enabled" : "disabled"}.`));
    }

    if (query.toLowerCase() === "r1") {
        thinkingEnabled = !thinkingEnabled;
        return chat.reply(mono(`Thinking mode has been ${thinkingEnabled ? "enabled" : "disabled"}.`));
    }

    if (!query) {
        return chat.reply(mono("Please provide a prompt! Example: deepseek say hello only one word"));
    }

    const data = {
        chat_session_id: "39cb391a-93a7-403d-b448-0e72cb2519c2",
        parent_message_id: null,
        prompt: query,
        ref_file_ids: [],
        thinking_enabled: thinkingEnabled,
        search_enabled: searchEnabled,
    };

    const config = {
        headers: {
            "x-ds-pow-response": "eyJhbGdvcml0aG0iOiJEZWVwU2Vla0hhc2hWMSIsImNoYWxsZW5nZSI6IjYwYzU5YTdlOGRlM2I0NmJkMWEyZmFhZGRmMjBmMzEwODQ3MDgzOWVhNTQxNDg3MTY2OWJkNWIwODc4ZmJmODAiLCJzYWx0IjoiMWNiZDllNTgyN2JlNTIyMTI4NDAiLCJhbnN3ZXIiOjIyNDM2LCJzaWduYXR1cmUiOiI2YWY3ZWQ3ZTJmNjdkN2YwMThlN2E5YmEwNDk4OTVhNTJhNmM2YzYyODc3NWQ3NjQ5ZjYyMjcxYzlmN2VhZTcxIiwidGFyZ2V0X3BhdGgiOiIvYXBpL3YwL2NoYXQvY29tcGxldGlvbiJ9",
            "x-client-platform": "web",
            "x-client-version": "1.0.0-always",
            "x-client-locale": "en_US",
            "x-app-version": "20241129.1",
            "authorization": "Bearer CoB4oOw0Ydua+pfi2/rWOhL9sqwJqhyEKJiCOLAva+W47AnVqu6Op4gpgK/PCBoi",
            "content-type": "application/json",
            "accept": "*/*",
            "User-Agent": "Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.23 Mobile Safari/537.36",
            "Referer": "https://chat.deepseek.com/a/chat/s/39cb391a-93a7-403d-b448-0e72cb2519c2",
        },
        responseType: "stream", 
    };

    const answering = await chat.reply(mono("🕐 | Generating response...")); 
    try {
        const response = await axios.post("https://chat.deepseek.com/api/v0/chat/completion", data, config);

        let combinedResponse = "";
        response.data.on("data", (chunk) => {
            const text = chunk.toString();
            if (text.trim() === "data: [DONE]") return;
            const match = text.match(/data:\s*(\{.*\})/);
            if (match) {
                const parsed = JSON.parse(match[1]);
                const deltaContent = parsed.choices[0]?.delta?.content || "";
                combinedResponse += deltaContent;
            }
        });

        response.data.on("end", async () => {
            if (!combinedResponse) {
                return answering.edit(mono("No response received. Please try again later."));
            }
            
          const line = "\n" + '━'.repeat(18) + "\n";
            
          const message = font.bold("🐋 | DEEPSEEK-R1") + line + combinedResponse.trim() + line + mono(`◉ USE "TOGGLE" TO SWITCH WEBSEARCH\n◉ USE "R1" TO FOR DEEPTHINK.`);

            await answering.edit(mono(combinedResponse.trim()));
        });

        response.data.on("error", (error) => {
            answering.edit(mono(`Error while streaming: ${error.message}`));
        });
    } catch (error) {
        await answering.edit(mono(`Error fetching response: ${error.message || "Unknown error."}`));
    }
};
