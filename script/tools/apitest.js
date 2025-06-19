const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports["config"] = {
    name: "apitest",
    isPrefix: false,
    aliases: ["test"],
    type: "tools",
    info: "Test any API endpoint with GET or POST.",
    usage: "[url] [optional: post_data]",
    guide: "Usage:\n" +
        "GET: `apitest <url>`\n" +
        "POST: `apitest <url> <post_data>`\n" +
        "Example:\n" +
        "apitest https://example.com/api/chat?q=hello&uid=1\n" +
        "apitest https://example.com/api/chat q=hello&uid=1\n",
    cd: 8
};

const urlRegex = /^(.*?\b)?https?:\/\/[\w.-]+(:\d+)?(\/[\w-./?%&=+]*)?(\b.*)?$/i;
const tempDir = path.join(__dirname, "cache");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const getExtensionFromContentType = (contentType) => {
    if (!contentType) return "txt"; 
    const typeMap = {
        "application/pdf": "pdf",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/ogg": "mp3",
        "audio/wav": "mp3",
        "audio/aac": "mp3",
        "audio/flac": "mp3",
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "video/mp4": "mp4"
    };
    return typeMap[contentType.split(";")[0]] || "txt"; 
};

const isMediaAttachment = (contentType) => {
    return /^(image|video|audio)\//.test(contentType);
};

module.exports["run"] = async ({ chat, args, font, admin, event }) => {
    const senderID = event.senderID;
    if (!args.length) return chat.reply(font.thin(module.exports.config.guide));

    let url = args[0]?.replace(/\(\.\)/g, ".") || "";
    if (!urlRegex.test(url)) return chat.reply(font.thin("❌ Invalid URL."));

    const isPost = args.length >= 2;
    let postData = isPost ? args.slice(1).join(" ") : null;

    try {
        const options = {
            method: isPost ? "POST" : "GET",
            url,
            responseType: "arraybuffer",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "*/*"
            },
        };

        if (isPost && postData) {
            try {
                postData = JSON.parse(postData);
                options.data = postData;
                options.headers["Content-Type"] = "application/json";
            } catch {
                options.data = new URLSearchParams(postData);
                options.headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }

        const { data, headers } = await axios(options);
        const contentType = headers["content-type"] || "";
        const fileExt = getExtensionFromContentType(contentType);

        if (contentType.includes("json")) {
            const jsonData = JSON.parse(data.toString());
            const formatted = JSON.stringify(jsonData, null, 2);
            return chat.reply(formatted); 
        }

        if (isMediaAttachment(contentType)) {
            const isAdmin = admin.includes(String(senderID));
            return sendFile(chat, fileExt, data, `📽️ API returned a ${fileExt.toUpperCase()}:`, isAdmin, font);
        }

        return sendFile(chat, "txt", data.toString(), "📄 Response attached.", true, font);
    } catch (error) {
        let errMsg = ``;
        if (error.response) {
            errMsg += `\nStatus: ${error.response.status}`;
            if (error.response.data) {
                errMsg += `\nResponse: ${error.response.data.toString().slice(0, 400)}`;
            }
        }
        chat.reply(font.thin(errMsg));
    }
};

async function sendFile(chat, ext, data, caption, allowAttachment, font) {
    if (!allowAttachment && ext !== "txt") {
        return chat.reply(font.thin("❌ Only admins can receive media attachments from this command."));
    }

    const filePath = path.join(tempDir, `file_${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, data);
    await chat.reply({
        body: font.thin(caption),
        attachment: fs.createReadStream(filePath),
    });

    fs.unlinkSync(filePath);
}