const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Helper function to get headers based on domain patterns
const getHeadersForUrl = (url) => {
    const domainPatterns = [{
        domains: ['pixiv.net', 'i.pximg.net'],
        headers: { Referer: 'http://www.pixiv.net/' }
    },
    {
        domains: ['deviantart.com'],
        headers: { Referer: 'https://www.deviantart.com/' }
    },
    {
        domains: ['artstation.com'],
        headers: { Referer: 'https://www.artstation.com/' }
    },
    {
        domains: ['instagram.com'],
        headers: { Referer: 'https://www.instagram.com/' }
    },
    {
        domains: ['googleusercontent.com'],
        headers: { Referer: 'https://images.google.com/' }
    },
    {
        domains: ['i.nhentai.net', 'nhentai.net'],
        headers: { Referer: 'https://nhentai.net/' }
    }];

    const domain = domainPatterns.find(({ domains }) =>
        domains.some(d => new RegExp(`(?:https?://)?(?:www\.)?(${d})`, 'i').test(url))
    );

    const headers = domain ? { ...domain.headers } : {};
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        headers['Accept'] = 'image/webp,image/apng,image/*,*/*;q=0.8';
    }

    return headers;
};

// Function to determine file extension based on Content-Type header
const getExtensionFromContentType = (contentType) => {
    if (contentType) {
        if (contentType.includes('image/jpeg')) return 'jpg';
        if (contentType.includes('image/png')) return 'png';
        if (contentType.includes('image/gif')) return 'gif';
        if (contentType.includes('application/pdf')) return 'pdf';
        if (contentType.includes('audio/mpeg')) return 'mp3';
        if (contentType.includes('video/mp4')) return 'mp4';
    }
    return 'txt'; // Default to 'txt' if content type isn't recognized
};

// Main download function
const download = async (inputs, responseType = 'arraybuffer', extension = "", savePath = "") => {
    inputs = Array.isArray(inputs) ? inputs : [inputs];

    const defaultPath = path.join(__dirname, '../script/cache');
    const targetPath = savePath || defaultPath;

    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    const files = await Promise.all(inputs.map(async (input) => {
        let filePath;

        // Handle Base64 strings
        if (typeof input === 'string' && /^[A-Za-z0-9+/=]+$/.test(input)) {
            const buffer = Buffer.from(input, 'base64');
            filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, buffer);
            const stream = fs.createReadStream(filePath);
            fs.unlink(filePath, () => {}); // Delete the file after creating the stream
            return stream;
        }

        // Handle Blob/Binary Buffer directly
        if (Buffer.isBuffer(input)) {
            filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, input);
            const stream = fs.createReadStream(filePath);
            fs.unlink(filePath, () => {}); // Delete the file after creating the stream
            return stream;
        }

        // Handle URL inputs
        if (/^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(input)) {
            const response = await axios.get(input, {
                responseType: responseType === 'base64' ? 'arraybuffer' : responseType,
                headers: getHeadersForUrl(input),
            });

            const contentType = response.headers['content-type'];
            const fileExtension = extension || getExtensionFromContentType(contentType);
            filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);

            if (responseType === 'arraybuffer' || responseType === 'binary') {
                // Save binary data to file
                fs.writeFileSync(filePath, response.data);
            } else if (responseType === 'stream') {
                // Save stream to file
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
            } else if (responseType === 'base64') {
                // Convert binary data to base64 and save to file
                const base64Data = Buffer.from(response.data).toString('base64');
                fs.writeFileSync(filePath, base64Data, 'utf8');
            } else {
                // For unsupported response types, save raw response
                fs.writeFileSync(filePath, response.data);
            }

            const stream = fs.createReadStream(filePath);
            fs.unlink(filePath, () => {}); // Delete the file after creating the stream
            return stream;
        }

        // Default: Save input as text file
        filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
        fs.writeFileSync(filePath, input);
        const stream = fs.createReadStream(filePath);
        fs.unlink(filePath, () => {}); // Delete the file after creating the stream
        return stream;
    }));

    return files.length === 1 ? files[0] : files;
};

module.exports = {
    download
};
