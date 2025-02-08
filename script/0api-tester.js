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
        "GET Request: `apitest <url>`\n" +
        "POST Request: `apitest <url> <post_data>`\n" +
        "\nExample:\n" +
        "apitest https://example.com/api/chat?q=hello&uid=1\n" +
        "apitest https://example.com/api/chat q=hello&uid=1",
    cd: 8
};

const urlRegex = /^https?:\/\/[\w.-]+(:\d+)?(\/[\w-./?%&=]*)?$/i;

module.exports["run"] = async ({ chat, event, args, font }) => {
    if (args.length === 0) {
        return chat.reply(font.thin(module.exports.config.guide));
    }

    let url = args[0].replace(/\(\.\)/g, ".");

    if (!urlRegex.test(url)) {
        return chat.reply(font.thin("❌ Invalid URL. Please provide a proper API URL."));
    }

    const isPost = args.length === 2;
    let postData = isPost ? args[1] : null;

    try {
        const options = {
            method: isPost ? "POST" : "GET",
            url: url,
            responseType: "text",
            headers: {
                "User-Agent": "Mozilla/5.0",
                "Accept": "application/json",
            },
        };

        if (isPost) {
            try {
                postData = JSON.parse(postData);
                options.data = postData;
                options.headers["Content-Type"] = "application/json";
            } catch (err) {
                options.data = new URLSearchParams(postData);
                options.headers["Content-Type"] = "application/x-www-form-urlencoded";
            }
        }

        console.log("🔍 Requesting:", options);

        const response = await axios(options);
        const contentType = response.headers["content-type"] || "";
        let data = response.data;

        if (contentType.includes("application/json")) {
            try {
                data = JSON.parse(response.data);
            } catch (error) {
                return chat.reply(font.thin("⚠️ The API response is not valid JSON."));
            }
        }

        let formattedData = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);

        if (formattedData.length > 4000) {
            const tempDir = path.join(__dirname, "cache");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            const tempFile = path.join(tempDir, `apitest_${Date.now()}.txt`);
            fs.writeFileSync(tempFile, formattedData, "utf8");

            chat.reply(
                { body: font.thin("RAW response is too big!"), attachment: fs.createReadStream(tempFile) },
                () => fs.unlinkSync(tempFile)
            );
        } else {
            chat.reply(formattedData);
        }
    } catch (error) {
        console.error("API Request Failed:", error);

        let errorMsg = `❌ Error: ${error.message}`;
        if (error.response) {
            errorMsg += `\nStatus: ${error.response.status}`;
            errorMsg += `\nResponse: ${JSON.stringify(error.response.data, null, 2)}`;
        }

        chat.reply(font.thin(errorMsg));
    }
};
