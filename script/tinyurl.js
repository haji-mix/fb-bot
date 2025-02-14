const { get } = require("axios");
        
        module.exports["config"] = {
                name: "tinyurl",
                aliases: ["shorten", "shorturl", "urlshort"],
                info: "shortens the provided URL",
                usage: "[link]",
                guide: "tinyurl https://pornhub.com",
        };
        
        module.exports["run"] = async ({ chat, args }) => {
                const url = args.join(" ");

                const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
        
                if (!url) {
                        return chat.reply("Please provide a URL to shorten.");
                }
        
                if (!urlRegex.test(url)) {
                        return chat.reply("Invalid URL format. Please provide a valid URL.");
                }
        
                try {
                        const response = await get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`);
                        chat.reply(response.data);
                } catch (error) {
                        chat.reply("An error occurred while shortening the URL.");
                }
        };