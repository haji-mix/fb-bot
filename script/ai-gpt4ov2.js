const axios = require("axios");
const randomUseragent = require('random-useragent');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "gpt4o",
    isPrefix: false,
    aliases: ["gpt",
        "gpt4"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    type: "artificial-intelligence",
    info: "Interact with the GPT4o AI.",
    usage: "[prompt]",
    guide: "gpt4o How does quantum mechanics work?",
    cd: 6
};


const conversationHistories = {};

module.exports["run"] = async ({
    chat, args, event, font, global
}) => {
    const apiUrl = "https://copyofgeneralassistant-27005.chipp.ai/api/chat";
    const userAgent = randomUseragent.getRandom(ua => ua.browserName === 'Firefox');
    const {
        threadID,
        senderID
    } = event;
    let query = args.join(" ");

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(font.monospace("Conversation history cleared."));
        return;
    }
    
if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

    if (!query) {
        chat.reply(font.monospace("Please provide a question!"));
        return;
    }

    let recog_url = [];

    if (event.messageReply && event.messageReply.attachments) {
        const attachments = event.messageReply.attachments;
        for (let i = 0; i < attachments.length; i++) {
            recog_url.push(attachments[i].url);
        }
    }

    const answering = await chat.reply(font.monospace("🕐 | Generating response..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({
        role: "user", content: query + (recog_url.length > 0 ? "\n\n" + recog_url.join("\n"): "")
    });

    const getResponse = async () => {
        return axios.post(apiUrl, {
            chatSessionId: "acab4b36-51b8-4320-bcb4-cacc1b45aa70",
            messages: conversationHistories[senderID]
        }, {
            headers: {
                'authority': 'copyofgeneralassistant-27005.chipp.ai',
                'method': 'POST',
                'path': '/api/chat',
                'scheme': 'https',
                'accept': '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9',
                'content-type': 'application/json',
                'cookie': 'GAESA=Co4BMDBjYTM2OTVkMmY2ZDZhNWM4MWE4NWQzODk0NjE3YjE1ZGY0YmM3N2JkNTkyZDJjNDU4NmFmY2QyYzJmZmU1NWY0MzM1MjQzYzZhMGRkNTlmMjE3NTM5NDM2OTM4Y2VjMDY1OGMyMDBmYzVjZWI0NjQ0MmNkOTA5ZGNkZjcyMTRiYzIyZTdiOTAxNGFhZhDcvv_FxzI; ph_phc_58R4nRj6BbHvFBIwUiMlHyD8X7B5xrup5HMX1EDFsFw_posthog=%7B%22distinct_id%22%3A%2201940c48-8dc5-7fbd-88df-b4c0918de7e9%22%2C%22%24sesid%22%3A%5B1737192630826%2C%22019478bf-ea2a-7122-9f7c-308c9880319b%22%2C1737192630826%5D%7D; __Host-next-auth.csrf-token=1d00c96057e2d55fb1ecaa9750bf651aebb2b826dc1143495885600d675219b9%7Cb1fb02f11ca520e1c90584fcb8a7c62605449d14ed1817ff217b6b6f9080142b; __Secure-next-auth.callback-url=https%3A%2F%2Fapp.chipp.ai; chatSessionId_27005=acab4b36-51b8-4320-bcb4-cacc1b45aa70; userId_27005=216d7c43-0de0-45d5-ba26-fcf55f8b0d9d',
                'origin': 'https://copyofgeneralassistant-27005.chipp.ai',
                'priority': 'u=1, i',
                'referer': 'https://copyofgeneralassistant-27005.chipp.ai/w/chat',
                'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'same-origin',
                'sec-gpc': '1',
                'user-agent': userAgent
            }
        });
    };

    const img_regex = /!\[Generated Image for (.*?)\]\((https?:\/\/[^\s()]+)\)/g;
    const recog_regex = /"result":"(.*?)"/g;
    const browse_regex = /"title":"(.*?)","link":"(.*?)","snippet":"(.*?)","date":"(.*?)"/g;
    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease try again later.";
    let info = [];
    let img_url = [];
    let recog_list = [];
    let browse_info = [];
    let match;


    while (attempts < maxRetries && !success) {
        try {
            const response = await getResponse();
            let fragments = response.data;
            while ((match = recog_regex.exec(fragments)) !== null) {
                recog_list.push(match[1]);
            }
            while ((match = browse_regex.exec(fragments)) !== null) {
                browse_info.push(`Title: ${match[1]}\nLink: ${match[2]}\nSnippet: ${match[3]}\nDate: ${match[4]}\n`);
            }
            while ((match = img_regex.exec(fragments)) !== null) {
                if (!info.includes(match[1])) {
                    info.push(match[1]);
                }
                img_url.push(match[2]);
            }
            let fragmentArray = fragments.match(/0:".*?"/g);
            if (fragmentArray) {
                let cleanedResponse = fragmentArray.map(fragment => fragment.substring(3, fragment.length - 1)).join("");
                answer = cleanedResponse.replace(/\\+n/g, '\n');
                success = true;
            } else if (info.length > 0) {
                answer = info
                .map((desk, index) => `${index + 1}. ${desk}`)
                .join('\n');
                success = true;
            } else if (browse_info.length > 0) {
                answer = browse_info.join("\n");
                success = true;
            } else if (recog_list.length > 0) {
                answer = recog_list
                .map((recog, index) => `${index + 1}. ${recog}`)
                .join('\n');
                success = true;
            } else {
                answer = fragments.replace(/\\+n/g, '\n');
                success = true;
            }

        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(font.monospace(`No response from the GPT4o. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(font.monospace("No response from the GPT4o. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({
            role: "assistant", content: answer
        });

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + '━'.repeat(18) + "\n";

        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        const message = font.bold(" 🤖 | GPT-4o PLUS") + line + answer.replace(/\\(.+?)\\/g, '"$1"') + line + font.monospace(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ REPLY TO "PICTURE" FOR IMAGE RECOGNITION.\n◉ DESCRIBE FOR IMAGE GENERATION.`);

        answering.edit(message);

        if (img_url.length > 0) {
            chat.reply({
                attachment: await chat.stream(img_url)
            });
        }

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
            await chat.reply({
                attachment: fileStream
            });

            fs.unlinkSync(filePath);
        }
    }
};