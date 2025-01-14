const axios = require("axios");
const fs = require("fs");
const path = require("path");

const getHeadersForUrl = (url) => {
    const domainPatterns = [{
        domains: ['pixiv.net',
            'i.pximg.net'],
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
            domains: ['i.nhentai.net',
                'nhentai.net'],
            headers: {
                Referer: 'https://nhentai.net/'
            }
        }];

    const domain = domainPatterns.find(({
        domains
    }) =>
        domains.some(d => url.includes(d))
    );

    const headers = domain ? {
        ...domain.headers
    }: {};

    if (url.endsWith('.jpg') || url.endsWith('.png')) {
        headers['Accept'] = 'image/webp,image/apng,image/*,*/*;q=0.8';
    }

    return headers;
};

const download = async (urls, responseType, extension = "") => {
    urls = Array.isArray(urls) ? urls: [urls];

    const files = await Promise.all(urls.map(async (url) => {
        const response = await axios.get(url, {
            responseType,
            headers: getHeadersForUrl(url),
        });

        if (responseType === 'arraybuffer') {
            const filePath = path.join(__dirname, '../script/cache', `${Date.now()}_media_file.${extension}`);
            fs.writeFileSync(filePath, response.data);
            setTimeout(() => fs.existsSync(filePath) && fs.unlinkSync(filePath), 600000); // 10 mins
            return fs.createReadStream(filePath);
        }

        return response.data;
    }));

    return files.length === 1 ? files[0]: files;
};

module.exports = {
    download
};