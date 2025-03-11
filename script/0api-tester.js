const axios = require("axios");
const fs = require("fs");
const path = require("path");

let mediaToggleEnabled = false;

module.exports["config"] = {
    name: "apitest",
    isPrefix: false,
    aliases: ["test"],
    info: "Test any API endpoint with GET or POST. Use 'apitest media' to toggle media sending.",
    usage: "[url] [optional: post_data]",
    guide: "Usage:\n" +
        "GET: `apitest <url>`\n" +
        "POST: `apitest <url> <post_data>`\n" +
        "Example:\n" +
        "apitest https://example.com/api/chat?q=hello&uid=1\n" +
        "apitest https://example.com/api/chat q=hello&uid=1\n"
    cd: 8
};

const urlRegex = /^(.*?\b)?https?:\/\/[\w.-]+(:\d+)?(\/[\w-./?%&=+]*)?(\b.*)?$/i;
const tempDir = path.join(__dirname, "cache");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

const getExtensionFromContentType = (contentType) => {
    if (!contentType) return "txt"; 
    const typeMap = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "application/pdf": "pdf",
        "audio/mpeg": "mp3",
        "audio/mp3": "mp3",
        "audio/ogg": "mp3",
        "audio/wav": "mp3",
        "audio/aac": "mp3",
        "audio/flac": "mp3",
        "video/mp4": "mp4",
        "video/webm": "webm",
        "video/ogg": "mp4"
    };
    return typeMap[contentType.split(";")[0]] || "txt"; 
};

module.exports["run"] = async ({ chat, args, font }) => {
    if (!args.length) return chat.reply(font.thin(module.exports.config.guide));

    if (args[0] === "media") {
        mediaToggleEnabled = !mediaToggleEnabled;
        return chat.reply(font.thin(`Media sending is now ${mediaToggleEnabled ? "enabled" : "disabled"}.`));
    }

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
            return formatted.length > 4000
                ? sendFile(chat, "txt", formatted, "📄 Large JSON response attached.")
                : chat.reply(formatted);
        }

        if (mediaToggleEnabled && /image|video|audio|gif/.test(contentType)) {
            return sendFile(chat, fileExt, data, `📽️ API returned a ${fileExt.toUpperCase()}:`);
        }

        return sendFile(chat, "txt", data.toString(), "📄 Non-JSON response attached.");
    } catch (error) {
        let errMsg = `❌ Error: ${error.message}`;
        if (error.response) {
            errMsg += `\nStatus: ${error.response.status}`;
            if (error.response.data) {
                errMsg += `\nResponse: ${error.response.data.toString().slice(0, 400)}`;
            }
        }
        chat.reply(font.thin(errMsg));
    }
};

async function sendFile(chat, ext, data, caption) {
    const filePath = path.join(tempDir, `file_${Date.now()}.${ext}`);
    fs.writeFileSync(filePath, data);
    const message = await chat.reply({
        body: caption,
        attachment: fs.createReadStream(filePath),
    });

    fs.unlinkSync(filePath);
    message.unsend(180000);
}