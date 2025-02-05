const axios = require("axios");
const fs = require("fs");
const path = require("path");

const targetPath = path.join(__dirname, '../script/cache');

// Function to delete all files in the target directory
const deleteDirectoryAndFiles = (dirPath) => {
    if (fs.existsSync(dirPath)) {
        const files = fs.readdirSync(dirPath);

        files.forEach((file) => {
            const filePath = path.join(dirPath, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
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
    const domainPatterns = [{
        domains: ['pixiv.net', 'i.pximg.net'], headers: {
            Referer: 'http://www.pixiv.net/'
        }},
        {
            domains: ['deviantart.com'], headers: {
                Referer: 'https://www.deviantart.com/'
            }},
        {
            domains: ['artstation.com'], headers: {
                Referer: 'https://www.artstation.com/'
            }},
        {
            domains: ['instagram.com'], headers: {
                Referer: 'https://www.instagram.com/'
            }},
        {
            domains: ['googleusercontent.com'], headers: {
                Referer: 'https://images.google.com/'
            }},
        {
            domains: ['i.nhentai.net', 'nhentai.net'], headers: {
                Referer: 'https://nhentai.net/'
            }},
        {
            domains: ['redirector.googlevideo.com'], headers: {
                Referer: 'https://en.y2mate.is/x107/'
            }}];

    const domain = domainPatterns.find(pattern =>
        pattern.domains.some(d => new RegExp(`(?:https?://)?(?:www\.)?(${d})`, 'i').test(url))
    );

    const headers = domain ? domain.headers: {};
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        headers['Accept'] = 'image/webp,image/apng,image/*,*/*;q=0.8';
    }

    return headers;
};

// Function to get the file extension based on the content type
const getExtensionFromContentType = (contentType) => {
    if (contentType) {
        if (contentType.includes('image/jpeg')) return 'jpg';
        if (contentType.includes('image/png')) return 'png';
        if (contentType.includes('image/gif')) return 'gif';
        if (contentType.includes('application/pdf')) return 'pdf';
        if (contentType.includes('audio/mpeg')) return 'mp3';
        if (contentType.includes('video/mp4')) return 'mp4';
    }
    return 'txt';
};

// Main download function
const download = async (inputs, responseType = 'arraybuffer', extension = "") => {
    inputs = Array.isArray(inputs) ? inputs: [inputs];

    // Ensure the target path exists
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, {
            recursive: true
        });
    }

    const files = await Promise.all(inputs.map(async (input) => {
        let filePath;

        // Handling base64 encoded strings
        if (typeof input === 'string' && /^[A-Za-z0-9+/=]+$/.test(input)) {
            const buffer = Buffer.from(input, 'base64');
            filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, buffer);
            const stream = fs.createReadStream(filePath);

            // Set a timeout to delete the file after 5 minutes
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (!err) {
                        console.log(`Deleted expired file: ${filePath}`);
                    }
                });
            }, 5 * 60 * 1000); // 5 minutes

            return stream;
        }

        // Handling Buffer inputs
        if (Buffer.isBuffer(input)) {
            filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, input);
            const stream = fs.createReadStream(filePath);

            // Set a timeout to delete the file after 5 minutes
            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (!err) {
                        console.log(`Deleted expired file: ${filePath}`);
                    }
                });
            }, 5 * 60 * 1000); // 5 minutes

            return stream;
        }

        if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(input)) {
            const response = await axios.get(input, {
                responseType: responseType === 'base64' ? 'arraybuffer': responseType,
                headers: getHeadersForUrl(input),
            });

            const contentType = response.headers['content-type'];
            const fileExtension = extension || getExtensionFromContentType(contentType);
            filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);
            if (responseType === 'arraybuffer' || responseType === 'binary') {
                fs.writeFileSync(filePath, response.data);
            } else if (responseType === 'stream') {
                return response.data;
            } else if (responseType === 'base64') {
                const base64Data = Buffer.from(response.data).toString('base64');
                fs.writeFileSync(filePath, base64Data, 'utf8');
            } else {
                fs.writeFileSync(filePath, response.data);
            }

            const stream = fs.createReadStream(filePath);

            setTimeout(() => {
                fs.unlink(filePath, (err) => {
                    if (!err) {
                        console.log(`Deleted expired file: ${filePath}`);
                    }
                });
            }, 5 * 60 * 1000);

            return stream;
        }
    }));

    return files.length === 1 ? files[0]: files;
};

module.exports = {
    download
};