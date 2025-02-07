const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports["config"] = {
    name: "copilot",
    isPrefix: false,
    aliases: ["copilot-chat",
        "github-copilot",
        "gcop",
        "cop"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with GitHub Copilot Chat AI coding assitant.",
    usage: "[prompt]",
    guide: "copilot Write a simple REST API in Node.js",
    cd: 6,
};

module.exports["run"] = async ({
    chat, args, font
}) => {

    const query = args.join(" ");
    if (!query) {
        chat.reply(font.monospace("Please provide a prompt!"));
        return;
    }

    const answering = await chat.reply(font.monospace("🕐 | Generating response..."));

    try {

        const headers = {
            'sec-ch-ua': '"Not)A;Brand";v="24", "Chromium";v="116"',
            'sec-ch-ua-mobile': '?1',
            'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36',
            'content-type': 'application/json',
            'accept': 'application/json',
            'x-requested-with': 'XMLHttpRequest',
            'github-verified-fetch': 'true',
            'sec-ch-ua-platform': '"Android"',
            'origin': 'https://github.com',
            'sec-fetch-site': 'same-origin',
            'sec-fetch-mode': 'cors',
            'sec-fetch-dest': 'empty',
            'referer': 'https://github.com/copilot',
            'accept-language': 'en-US,en;q=0.9',
            'cookie': '_octo=GH1.1.1126303553.1735553986; _device_id=1e2414f73f81229b737b92251e7ddb0c; saved_user_sessions=152267140%3AkEByvUOa2PyeMqXwXMG0zqreQxAjhYq7FM2Emmk3pbYD6baD%7C191758792%3A6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; user_session=6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; __Host-user_session_same_site=6vqKEQ11AHXzjXhz_1jNOnMQIvd39mg0xqlq07boIUx374Zd; logged_in=yes; dotcom_user=haji-mix; color_mode=%7B%22color_mode%22%3A%22auto%22%2C%22light_theme%22%3A%7B%22name%22%3A%22light%22%2C%22color_mode%22%3A%22light%22%7D%2C%22dark_theme%22%3A%7B%22name%22%3A%22dark%22%2C%22color_mode%22%3A%22dark%22%7D%7D; cpu_bucket=lg; preferred_color_mode=dark; tz=Asia%2FManila; _gh_sess=58hwKZze2uyKpibEOGA43wFRI1XyooQ3bWQSeJt3HpP%2BG%2FbXu%2BqfhGDHPlTZTHjIfda1iPXXRZGPUilowDi%2BDKPoD2OCTEqz%2FMiXgXLmz1b5ybqQCYSmtQNXoFG2D188puQ6olKwAVnbdTHwMjhdKfKjumcrEbM2OKYknQTAnw1oVWGc9Ztu%2Bbaf5Q%2Ff4mgVrugVk3lJb5VsvwmoYaDauRERIRxgeeFbA8PDjYNmldlvM9x9gPeoMcNH9tq5XQtFUCafFOohv4QS%2BjzmKzDxjWJHB4gkF9sB%2FLhpRYI8q5D3w3hszcFfkNIGRm8K3IHulf8H0Q%3D%3D--OwW62Ih0MPSXaE8u--yDHGLg7xBS8ZjreAoZD%2BHQ%3D%3D'
        };

        const apiKey = await axios.post("https://github.com/github-copilot/chat/token", {}, {
            headers
        });

        const headers2 = {
            "host": "api.individual.githubcopilot.com",
            "cache-control": "max-age=0",
            "sec-ch-ua-platform": "\"Android\"",
            "authorization": "GitHub-Bearer " + apiKey.data.token,
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

        const payload = {
            content: query,
            intent: "conversation",
            references: [],
            context: [],
            currentURL: "https://github.com/copilot",
            streaming: true,
            confirmations: [],
            customInstructions: [],
            model: "gpt-4o",
            mode: "immersive",
            customCopilotID: null,
            parentMessageID: "",
            tools: [],
            mediaContent: []
        };

        const response = await axios.post("https://api.individual.githubcopilot.com/github/chat/threads/4e5b591e-3c89-43d6-b053-c57289778b68/messages?", payload, {
            headers2
        });
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
            completeMessage = completeMessage.replace(/\*\*(.*?)\*\*/g,
                (_, text) => font.bold(text));

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
                await chat.reply({
                    attachment: fileStream
                });

                fs.unlinkSync(filePath);
            }
        } else {
            await answering.edit(font.monospace(`Request failed with status code ${response.status}`));
        }
    } catch (error) {
        await answering.edit(font.monospace(`Error: ${error.message}`));
    }
};