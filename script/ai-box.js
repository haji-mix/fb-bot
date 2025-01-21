const axios = require("axios");
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "box",
    aliases: ["bb", "blackbox", "blackbox-ai"],
    version: "1.0.0",
    credits: "Kenneth Panio",
    role: 0,
    isPrefix: false,
    type: "artificial-intelligence",
    info: "Interact with blackbox-ai. Specialized in programming and finding source code.",
    usage: "[prompt]",
    guide: "blackbox How does nuclear fusion work?",
    cd: 6
};

const conversationHistories = {};
let webSearchMode = false;
let codeModelMode = false;

module.exports["run"] = async ({ chat, args, event, font, global }) => {
    var mono = txt => font.monospace(txt);
    const { threadID, senderID } = event;
    const query = args.join(" ");
    
    if (!query) return chat.reply(font.thin("Please provide a text to ask. e.g: box generate a python program rest api example?"));

    if (['clear', 'reset', 'forgot', 'forget'].includes(query.toLowerCase())) {
        conversationHistories[senderID] = [];
        chat.reply(mono("Conversation history cleared."));
        return;
    }

    if (query.toLowerCase() === 'toggle') {
        webSearchMode = !webSearchMode;
        chat.reply(mono(`Web search mode has been ${webSearchMode ? 'enabled' : 'disabled'}.`));
        return;
    }
    
    if (query.toLowerCase() === 'code') {
        codeModelMode = !codeModelMode;
        chat.reply(mono(`Code model mode has been ${codeModelMode ? 'enabled' : 'disabled'}.`));
        return;
    }

    const answering = await chat.reply(mono("🕐 | Generating Response..."));

    conversationHistories[senderID] = conversationHistories[senderID] || [];
    conversationHistories[senderID].push({ role: "user", content: query });

    const getResponse = async () => {
        const data = {
            agentMode: {},
            clickedAnswer2: false,
            clickedAnswer3: false,
            clickedForceWebSearch: false,
            codeInterpreterMode: false,
            codeModelMode: codeModelMode,
            deepSearchMode: false,
            domains: null,
            githubToken: "",
            id: "D67lvmZ",
            imageGenerationMode: false,
            isChromeExt: false,
            isMicMode: false,
            maxTokens: 1024,
            messages: conversationHistories[senderID],
            mobileClient: false,
            playgroundTemperature: null,
            playgroundTopP: null,
            previewToken: null,
            trendingAgentMode: {},
            userId: null,
            userSelectedModel: null,
            userSystemPrompt: null,
            validated: "00f37b34-a166-4efb-bce5-1312d87f2f94",
            visitFromDelta: false,
            vscodeClient: false,
            webSearchModePrompt: webSearchMode
        };

        const config = {
            headers: {
                'Authority': 'www.blackbox.ai',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br, zstd',
                'Accept-Language': 'en-US,en;q=0.9',
                'Content-Type': 'application/json',
                'Cookie': 'sessionId=1a755475-5f12-43e6-93b6-ef017f3fdd2f; render_session_affinity=eef06e5a-7dd7-4eb8-91f4-d6510fed4500; __Host-authjs.csrf-token=a9b082d723b058326277a01b8103bee363baea40cc8f8bb24d82c8147756103a%7C941abca9d30e7191720b8e310f9d1eeff00cc7112be0d9a22e5f4762c63e941f; __Secure-authjs.callback-url=https%3A%2F%2Fwww.blackbox.ai; __Secure-authjs.session-token=eyJhbGciOiJkaXIiLCJlbmMiOiJBMjU2R0NNIn0..V35RYSO-Q6AGiPUD.5a0Tb2FlJC2S505E4RDBUx-LWIKnOCpVZVqUZcSJz1oTw8F7-phgZpVu3pbJ0CHmEWnzEa9lELZQaR2PyMSRbDgYJ6-04uRO5t8N1I9E-Ropz8hV4A8Rg15IVScBhv-xfbryb3sopRGo0bjoyqlboyDzKpGrIsZMNIzBSrOve2b2f0kFhYpmB4TyLzc6T5F4gmBOrIKTyBXuZJ_vBOvOHgQGfmylLnqH9eNuo9BYucnlpUePV9ZvfFjE43GdJe2WZZ07vlbzEBSrlzRxdrcWhICR-E21SclHPzGA7ogoaSc20snSNVm7Jnnk0pCtmIOOAOZgB9EepSUr92RwVb6fP5w-9PKnR2rbb3lI-YlRbprKkpsQY8d9c4c4ECmNEycwtioSygAUl6-IQgl2hM5oYpZS4_SN8XC62AQHXPQiA9AOObBG6IWFUxcy3uqZevdp-RfKbsFRTaMP6GCLNiRFtx1MmPqaIz40VCMi_qqtsCp82i5QDoq2YA.JKSC-3_bUdbF_AXkS1Mtrw',
                'Origin': 'https://www.blackbox.ai',
                'Priority': 'u=1, i',
                'Referer': 'https://www.blackbox.ai/',
                'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'empty',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Site': 'same-origin',
                'Sec-Gpc': '1',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
        };

        try {
            const response = await axios.post('https://www.blackbox.ai/api/v1/chat', data, config);
            return response.data;
        } catch (error) {
            throw new Error(`Error fetching response from Blackbox AI: ${error.message}`);
        }
    };

    const maxRetries = 3;
    let attempts = 0;
    let success = false;
    let answer = "Under Maintenance!\n\nPlease use other models get started with 'help'";
    
    while (attempts < maxRetries && !success) {
        try {
            const response = await getResponse();
            answer = response.replace(/\$@\$(.*?)\$@\$/g, '').trim();
            success = true;
        } catch (error) {
            attempts++;
            if (attempts < maxRetries) {
                await answering.edit(mono(`No response from Blackbox AI. Retrying... (${attempts} of ${maxRetries} attempts)`));
                await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            } else {
                answering.edit(mono("No response from Blackbox AI. Please try again later: " + error.message));
                return;
            }
        }
    }

    if (success) {
        conversationHistories[senderID].push({
            role: "assistant", content: answer
        });

        if (webSearchMode) {
            try {
                const sources = extractSources(answer);
                answer = answer.replace(/\$~~~\$[\s\S]*?\$~~~\$/g, '').trim();
                if (sources.length > 0) {
                    answer += font.bold("\n\nTop Sources:\n\n") + sources.map((source, index) => font.bold(`${index + 1}. ${source.title}\n`) + mono(`${source.snippet}\n\n`) + `${source.link}`).join("\n\n");
                }
            } catch (error) {
                answering.edit(mono("Error extracting sources."));
            }
        }

        const codeBlocks = answer.match(/```[\s\S]*?```/g) || [];
        const line = "\n" + '━'.repeat(18) + "\n";
        
        answer = answer.replace(/Generated by BLACKBOX\.AI, try unlimited chat https:\/\/www\.blackbox\.ai/g, "").trim();

        answer = answer.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text));

        const message = font.bold("⬛ | BLACKBOX AI") + line + answer + line + mono(`◉ USE "CLEAR" TO RESET CONVERSATION.\n◉ USE "TOGGLE" TO SWITCH WEBSEARCH\n◉ USE "CODE" TO SWITCH CODING MODEL.`);

        await answering.edit(message);

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

function extractSources(answer) {
    const sourceRegex = /\{.*?"title":\s*"(.*?)".*?"link":\s*"(.*?)".*?"snippet":\s*"(.*?)".*?\}/g;
    const sources = [];
    let match;

    while ((match = sourceRegex.exec(answer)) !== null) {
        const title = match[1].replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))).trim();
        const link = match[2].trim();
        const snippet = match[3].replace(/\\n/g, ' ').replace(/\\u[\dA-F]{4}/gi, (match) => String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))).trim();
        sources.push({
            title, link, snippet
        });
    }

    return sources;
}
