const axios = require("axios");
const fs = require("fs");
const path = require("path");
const https = require("https"); 

const targetPath = path.join(__dirname, "../cache");

const axiosInstance = axios.create({
    httpsAgent: new https.Agent({
        rejectUnauthorized: false, // Disable SSL certificate verification
    }),
});

const ensureDirectory = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
    } catch (error) {
        console.error("Error creating directory:", error);
    }
};

const getHeadersForUrl = (url) => {
    const domainPatterns = [
        { domains: ["pixiv.net", "i.pximg.net"], headers: { Referer: "http://www.pixiv.net/" } },
        { domains: ["deviantart.com"], headers: { Referer: "https://www.deviantart.com/" } },
        { domains: ["artstation.com"], headers: { Referer: "https://www.artstation.com/" } },
        { domains: ["instagram.com"], headers: { Referer: "https://www.instagram.com/" } },
        { domains: ["googleusercontent.com"], headers: { Referer: "https://images.google.com/" } },
        { domains: ["i.nhentai.net", "nhentai.net"], headers: { Referer: "https://nhentai.net/" } },
    ];

    try {
        const domain = domainPatterns.find((pattern) =>
            pattern.domains.some((d) => new RegExp(`(?:https?://)?(?:www\.)?(${d})`, "i").test(url))
        );
        return domain ? domain.headers : {};
    } catch (error) {
        return {};
    }
};

const getExtensionFromUrl = (url) => {
    try {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
        return match ? match[1].toLowerCase() : null;
    } catch (error) {
        return null;
    }
};

const getExtensionFromContentType = (contentType) => {
    if (!contentType) return null;
    const typeMap = {
        "image/jpeg": "jpg",
        "image/webp": "png",
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
        "video/ogg": "mp4",
    };
    return typeMap[contentType.split(";")[0]] || null;
};

const FALLBACK_EXTENSION = "txt";

const download = async (urls, responseType = "stream", extension = "") => {
    urls = Array.isArray(urls) ? urls : [urls];
    if (responseType === "arraybuffer") ensureDirectory(targetPath);

    try {
        const files = await Promise.all(
            urls.map(async (url) => {
                if (!/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(url)) {
                    return null;
                }

                try {
                    let fileExtension = getExtensionFromUrl(url);
                    const axiosConfig = {
                        responseType: responseType === "stream" ? "stream" : "arraybuffer",
                        headers: getHeadersForUrl(url),
                    };

                    const response = await axiosInstance.get(url, axiosConfig);

                    if (!fileExtension) {
                        fileExtension = getExtensionFromContentType(response.headers["content-type"]);
                    }
                    fileExtension = fileExtension || extension || FALLBACK_EXTENSION;

                    if (responseType === "stream") {
                        return response.data;
                    }

                    const filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);
                    fs.writeFileSync(filePath, response.data);

                    setTimeout(() => fs.unlink(filePath, (err) => err && console.error("Error deleting file:", err)), 5 * 60 * 1000);

                    return fs.createReadStream(filePath);
                } catch (error) {
                    console.error(`Error downloading ${url}:`, error.message);
                    return null;
                }
            })
        );

        return files.length === 1 ? files[0] : files;
    } catch (error) {
        console.error("Error in download function:", error.message);
        return null;
    }
};

module.exports = { download };