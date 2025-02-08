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
    "📌 POST Request: `apitest <url> <post_data>` (Only works if exactly one extra argument is given)\n" +
    "\nExample:\n" +
    "✅ `apitest https://example(.)com/chat/api?q`\n" +
    "✅ `apitest https://example(.)com/chat/api q=hello&uid=1`",
    cd: 8
};

const urlRegex = /https?:\/\/[\w.-]+\.[a-z]{2,}[\w-./?%&=]*/gi;

module.exports["run"] = async ({
    chat, event, args, font
}) => {
    if (args.length === 0) {
        return chat.reply(font.thin(module.exports.config.guide));
    }

    let url = args[0].replace(/\(\.\)/g, ".");

    if (!urlRegex.test(url)) {
        return chat.reply(font.thin("❌ Invalid URL. Please provide a proper API URL."));
    }

    const isPost = args.length === 2;
    const postData = isPost ? args[1]: null;

    try {
        const options = {
            method: isPost ? "POST": "GET",
            url: url,
            responseType: "text"
        };

        if (isPost) {
            const params = Object.fromEntries(new URLSearchParams(postData));
            options.data = params;
            options.headers = {
                "Content-Type": "application/x-www-form-urlencoded"
            };
        }

        const response = await axios(options);

        let data;
        try {
            data = JSON.parse(response.data);
        } catch (error) {
            return chat.reply(font.thin("⚠️ The API did not return JSON data."));
        }

        let formattedData = JSON.stringify(data, null, 2).replace(urlRegex, (match) =>
            match.replace(/\./g, "(.)")
        );

        if (formattedData.length > 4000) {
            const tempDir = path.join(__dirname, "cache");
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);

            const tempFile = path.join(tempDir, `apitest_${Date.now()}.txt`);
            fs.writeFileSync(tempFile, formattedData, "utf8");

            chat.reply({
                body: font.thin("RAW response is too big!"),
                attachment: fs.createReadStream(tempFile)
            }, () => {
                fs.unlinkSync(tempFile);
            });
        } else {
            chat.reply(formattedData);
        }
    } catch (error) {
        chat.reply(font.thin(`❌ Error: ${error.message}`));
    }
};