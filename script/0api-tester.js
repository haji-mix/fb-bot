const axios = require("axios");
const fs = require("fs");
const path = require("path");

module.exports["config"] = {
    name: "apitest",
    isPrefix: false,
    aliases: ["test"],
    info: "Test API URL endpoint with GET or POST",
    usage: "[url] [optional: post_data]",
    guide: "Usage:\n" +
        "📌 GET Request: `apitest <url>`\n" +
        "📌 POST Request: `apitest <url> <post_data>` (Only works if exactly one space extra argument is given)\n" +
        "\nExample:\n" +
        "✅ `apitest https://example(.)com/chat/api?q=hello&uid=1`\n" +
        "✅ `apitest https://example(.)com/chat/api q=hello&uid=1`",
    cd: 8
};

// Updated regex to allow ports (e.g., :25645)
const urlRegex = /https?:\/\/[\w.-]+\.[a-z]{2,}(:\d+)?[\w-./?%&=]*/gi;

module.exports["run"] = async ({ chat, event, args, font }) => {
    if (args.length === 0) {
        return chat.reply(font.thin(module.exports.config.guide));
    }

    // Replace (.) with . for user-friendly input
    let url = args[0].replace(/\(\.\)/g, ".");

    if (!urlRegex.test(url)) {
        return chat.reply(font.thin("❌ Invalid URL. Please provide a proper API URL."));
    }

    const isPost = args.length === 2;
    const postData = isPost ? args[1] : null;

    try {
        const options = {
            method: isPost ? "POST" : "GET",
            url: url,
            responseType: "text"
        };

        if (isPost) {
            // Check if the post data is JSON or form data
            try {
                options.data = JSON.parse(postData);
                options.headers = { "Content-Type": "application/json" };
            } catch (err) {
                // If it's not valid JSON, treat it as form data
                const params = Object.fromEntries(new URLSearchParams(postData));
                options.data = params;
                options.headers = { "Content-Type": "application/x-www-form-urlencoded" };
            }
        }

        const response = await axios(options);

        // Handle different content types
        const contentType = response.headers["content-type"] || "";
        let data = response.data;

        if (contentType.includes("application/json")) {
            try {
                data = JSON.parse(response.data);
            } catch (error) {
                return chat.reply(font.thin("⚠️ The API response is not valid JSON."));
            }
        }

        // Convert to string if necessary
        let formattedData = typeof data === "object" ? JSON.stringify(data, null, 2) : String(data);

        // Mask URLs in the response
        formattedData = formattedData.replace(urlRegex, (match) => match.replace(/\./g, "(.)"));

        // Handle large responses
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
        chat.reply(font.thin(`❌ Error: ${error.message}`));
    }
};
