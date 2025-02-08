const axios = require("axios");
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, "../script/cache");

// Function to delete all files in the target directory
const deleteDirectoryAndFiles = (dirPath) => {
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

    const domain = domainPatterns.find((pattern) =>
        pattern.domains.some((d) => new RegExp(`(?:https?://)?(?:www\.)?(${d})`, "i").test(url))
    );

    const headers = domain ? domain.headers : {};
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        headers["Accept"] =
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7";
    }

    return headers;
};

// Function to get the file extension from a URL
const getExtensionFromUrl = (url) => {
    const match = url.match(/\.([a-zA-Z0-9]+)(?:\?|#|$)/);
    return match ? match[1].toLowerCase() : null;
};

// Function to get the file extension from the content type
const getExtensionFromContentType = (contentType) => {
    if (!contentType) return null;
    if (contentType.includes("image/jpeg")) return "jpg";
    if (contentType.includes("image/png")) return "png";
    if (contentType.includes("image/gif")) return "gif";
    if (contentType.includes("application/pdf")) return "pdf";
    if (contentType.includes("audio/mpeg")) return "mp3";
    if (contentType.includes("video/mp4")) return "mp4";
    return null;
};

// Default fallback extension
const FALLBACK_EXTENSION = "txt";

// Main download function
const download = async (inputs, responseType = "arraybuffer", extension = "") => {
    inputs = Array.isArray(inputs) ? inputs : [inputs];

    // Ensure the target path exists
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    const files = await Promise.all(
        inputs.map(async (input) => {
            let filePath;

            // Handling base64 encoded strings
            if (typeof input === "string" && /^[A-Za-z0-9+/=]+$/.test(input)) {
                const buffer = Buffer.from(input, "base64");
                filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || FALLBACK_EXTENSION}`);
                fs.writeFileSync(filePath, buffer);
                setTimeout(() => fs.unlink(filePath, () => {}), 5 * 60 * 1000);
                return fs.createReadStream(filePath);
            }

            // Handling Buffer inputs
            if (Buffer.isBuffer(input)) {
                filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || FALLBACK_EXTENSION}`);
                fs.writeFileSync(filePath, input);
                setTimeout(() => fs.unlink(filePath, () => {}), 5 * 60 * 1000);
                return fs.createReadStream(filePath);
            }

            // Handling URL inputs
            if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(input)) {
                // Extract extension from URL
                let fileExtension = getExtensionFromUrl(input) || extension;

                const response = await axios.get(input, {
                    responseType: responseType === "base64" ? "arraybuffer" : responseType,
                    headers: getHeadersForUrl(input),
                });

                // If no valid extension from URL, get it from Content-Type
                if (!fileExtension) {
                    fileExtension = getExtensionFromContentType(response.headers["content-type"]) || FALLBACK_EXTENSION;
                }

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

                setTimeout(() => fs.unlink(filePath, () => {}), 5 * 60 * 1000);
                return fs.createReadStream(filePath);
            }
        })
    );

    return files.length === 1 ? files[0] : files;
};

module.exports = { download };
