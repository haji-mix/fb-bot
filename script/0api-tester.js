const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports["config"] = {
    name: "apitest",
    isPrefix: false,
    aliases: ["test"],
    info: "Test any API endpoint with GET or POST",
    usage: "[url] [optional: post_data]",
    guide: "Usage:\n" +
    "GET: `apitest <url>`\n" +
    "POST: `apitest <url> <post_data>`\n" +
    "Example:\n" +
    "apitest https://example.com/api/chat?q=hello&uid=1\n" +
    "apitest https://example.com/api/chat q=hello&uid=1",
    cd: 8
};

const urlRegex = /^https?:\/\/[\w.-]+(:\d+)?(\/[\w-./?%&=]*)?$/i;
const tempDir = path.join(__dirname, "cache");
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

module.exports["run"] = async ({ chat, args, font }) => {
    if (!args.length) return chat.reply(font.thin(module.exports.config.guide));

    let url = args[0]?.replace(/\(\.\)/g, ".") || "";
    if (!urlRegex.test(url)) return chat.reply(font.thin("❌ Invalid URL."));

    const isPost = args.length >= 2;
    let postData = isPost ? args.slice(1).join(" ") : null; // Ensure all extra args are used

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

        if (contentType.includes("json")) {
            const jsonData = JSON.parse(data.toString());
            const formatted = JSON.stringify(jsonData, null, 2);
            return formatted.length > 4000
                ? sendFile(chat, "txt", formatted, "📄 Large JSON response attached.")
                : chat.reply(formatted);
        }

        if (/image|video|audio|gif/.test(contentType)) {
            const ext = contentType.includes("gif") ? "gif" : contentType.split("/")[1] || "bin";
            return sendFile(chat, ext, data, `📽️ API returned a ${ext.toUpperCase()}:`);
        }

        // Send non-JSON response as a .txt file
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
