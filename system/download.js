const axios = require("axios");
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../script/cache");

// Function to delete all files in the target directory
const deleteDirectoryAndFiles = (dirPath) => {
    try {
        if (fs.existsSync(dirPath)) {
            const files = fs.readdirSync(dirPath);
            files.forEach((file) => {
                const filePath = path.join(dirPath, file);
                if (fs.statSync(filePath).isDirectory()) {
                    deleteDirectoryAndFiles(filePath);
                } else {
                    fs.unlinkSync(filePath);
                }
            });
            fs.rmdirSync(dirPath);
        }
    } catch (error) {
        console.error("Error deleting directory:", error);
    }
};

// Delete existing cache files before starting
deleteDirectoryAndFiles(targetPath);

// Function to get headers based on the URL
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
        console.error("Error getting headers for URL:", error);
        return {};
    }
};

// Function to get the file extension from a URL
const getExtensionFromUrl = (url) => {
    try {
        const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
        return match ? match[1].toLowerCase() : null;
    } catch (error) {
        console.error("Error getting extension from URL:", error);
        return null;
    }
};

// Function to get the file extension from the Content-Type header
const getExtensionFromContentType = (contentType) => {
    if (!contentType) return null;
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
    return typeMap[contentType.split(";")[0]] || null;
};

// Default fallback extension
const FALLBACK_EXTENSION = "txt";

// Main download function
const download = async (inputs, responseType = "arraybuffer", extension = "") => {
    inputs = Array.isArray(inputs) ? inputs : [inputs];

    // Ensure the target path exists
    try {
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath, { recursive: true });
        }
    } catch (error) {
        console.error("Error ensuring target path exists:", error);
    }

    try {
        const files = await Promise.all(
            inputs.map(async (input) => {
                let filePath;

                try {
                    // Handling base64 encoded strings
                    if (typeof input === "string" && /^[A-Za-z0-9+/=]+$/.test(input)) {
                        const buffer = Buffer.from(input, "base64");
                        filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || FALLBACK_EXTENSION}`);
                        fs.writeFileSync(filePath, buffer);
                        setTimeout(() => fs.unlink(filePath, (err) => err && console.error("Error deleting file:", err)), 5 * 60 * 1000);
                        return fs.createReadStream(filePath);
                    }

                    // Handling Buffer inputs
                    if (Buffer.isBuffer(input)) {
                        filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || FALLBACK_EXTENSION}`);
                        fs.writeFileSync(filePath, input);
                        setTimeout(() => fs.unlink(filePath, (err) => err && console.error("Error deleting file:", err)), 5 * 60 * 1000);
                        return fs.createReadStream(filePath);
                    }

                    // Handling URL inputs
                    if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(input)) {
                        let fileExtension = getExtensionFromUrl(input); // Get extension from URL

                        const response = await axios.get(input, {
                            responseType: responseType === "base64" ? "arraybuffer" : responseType,
                            headers: getHeadersForUrl(input),
                        });

                        if (!fileExtension) {
                            fileExtension = getExtensionFromContentType(response.headers["content-type"]); // Get extension from headers
                        }

                        fileExtension = fileExtension || extension || FALLBACK_EXTENSION; // Ensure fallback

                        filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);

                        if (responseType === "arraybuffer" || responseType === "binary") {
                            fs.writeFileSync(filePath, response.data);
                        } else if (responseType === "stream") {
                            return response.data;
                        } else if (responseType === "base64") {
                            fs.writeFileSync(filePath, Buffer.from(response.data).toString("base64"), "utf8");
                        } else {
                            fs.writeFileSync(filePath, response.data);
                        }

                        setTimeout(() => fs.unlink(filePath, (err) => err && console.error("Error deleting file:", err)), 5 * 60 * 1000);
                        return fs.createReadStream(filePath);
                    }
                } catch (error) {
                    return null;
                }
            })
        );

        return files.length === 1 ? files[0] : files;
    } catch (error) {
        return null;
    }
};

module.exports = { download };
