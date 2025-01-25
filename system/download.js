const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Helper function aron kuhaon ang mga headers base sa domain patterns
const getHeadersForUrl = (url) => {
    const domainPatterns = [{
        domains: ['pixiv.net', 'i.pximg.net'],
        headers: {
            Referer: 'http://www.pixiv.net/'
        }
    },
    {
        domains: ['deviantart.com'],
        headers: {
            Referer: 'https://www.deviantart.com/'
        }
    },
    {
        domains: ['artstation.com'],
        headers: {
            Referer: 'https://www.artstation.com/'
        }
    },
    {
        domains: ['instagram.com'],
        headers: {
            Referer: 'https://www.instagram.com/'
        }
    },
    {
        domains: ['googleusercontent.com'],
        headers: {
            Referer: 'https://images.google.com/'
        }
    },
    {
        domains: ['i.nhentai.net', 'nhentai.net'],
        headers: {
            Referer: 'https://nhentai.net/'
        }
    }];

    // I-check kung ang URL ba mosunod sa bisan unsang domain pattern
    const domain = domainPatterns.find(({ domains }) =>
        domains.some(d => new RegExp(`(?:https?://)?(?:www\.)?(${d})`, 'i').test(url))
    );

    const headers = domain ? {
        ...domain.headers
    } : {};

    // Kung image file, i-set ang Accept header
    if (url.match(/\.(jpg|jpeg|png|gif)$/i)) {
        headers['Accept'] = 'image/webp,image/apng,image/*,*/*;q=0.8';
    }

    return headers;
};

// Function para i-check kung base64 encoded ba ang string
const isBase64 = (str) => {
    try {
        return Buffer.from(str, 'base64').toString('base64') === str;
    } catch (e) {
        return false;
    }
};

// Function para kuhaon ang file extension base sa Content-Type
const getExtensionFromContentType = (contentType) => {
    if (contentType) {
        if (contentType.includes('image/jpeg')) return 'jpg';
        if (contentType.includes('image/png')) return 'png';
        if (contentType.includes('image/gif')) return 'gif';
        if (contentType.includes('application/pdf')) return 'pdf';
        if (contentType.includes('audio/mpeg')) return 'mp3';
        if (contentType.includes('video/mp4')) return 'mp4';
        // Pwede pa nimo idugang ang uban pang content types
    }
    return 'txt'; // Kung wala, default nga extension kay '.txt'
};

// Main function para mag-download
const download = async (inputs, responseType = 'arraybuffer', extension = "", savePath = "") => {
    // Siguraduhon nga ang inputs kay array
    inputs = Array.isArray(inputs) ? inputs : [inputs];

    // Default nga save path kung wala gi-provide
    const defaultPath = path.join(__dirname, '../script/cache');
    const targetPath = savePath || defaultPath;

    // Siguraduhon nga ang directory mag-exist, kung wala, buhaton siya
    if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
    }

    const files = await Promise.all(inputs.map(async (input) => {
        // Kung Base64 encoded ang input, i-decode ug isulat as file
        if (isBase64(input)) {
            const buffer = Buffer.from(input, 'base64');
            const filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, buffer);
            setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // I-delete after 10 minutes
            return fs.createReadStream(filePath);
        }

        // Kung ang input kay binary Buffer, diretso i-save siya as file
        if (Buffer.isBuffer(input)) {
            const filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
            fs.writeFileSync(filePath, input);
            setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // I-delete after 10 minutes
            return fs.createReadStream(filePath);
        }

        // Kung URL ang input, i-process siya
        const isUrl = /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i.test(input);
        if (isUrl) {
            const response = await axios.get(input, {
                responseType,
                headers: getHeadersForUrl(input),
            });

            // Kung walay gi-provide nga extension, i-infer gikan sa Content-Type header
            const contentType = response.headers['content-type'];
            const fileExtension = extension || getExtensionFromContentType(contentType);

            // I-handle ang response depende sa responseType
            if (responseType === 'arraybuffer') {
                const filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);
                fs.writeFileSync(filePath, response.data);
                setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // I-delete after 10 minutes
                return fs.createReadStream(filePath);
            }

            if (responseType === 'stream') {
                const filePath = path.join(targetPath, `${Date.now()}_media_file.${fileExtension}`);
                const writer = fs.createWriteStream(filePath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                    writer.on('finish', resolve);
                    writer.on('error', reject);
                });
                setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // I-delete after 10 minutes
                return fs.createReadStream(filePath);
            }
            return response.data;
        }

        // Kung dili URL o Base64, i-treat ang input as generic data
        const filePath = path.join(targetPath, `${Date.now()}_media_file.${extension || 'txt'}`);
        fs.writeFileSync(filePath, input);
        setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // I-delete after 10 minutes
        return fs.createReadStream(filePath);
    }));

    return files.length === 1 ? files[0] : files;
};

module.exports = download;
