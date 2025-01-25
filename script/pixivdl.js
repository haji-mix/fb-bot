const nexo = require('nexo-aio-downloader');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "pixivdl",
    version: "69",
    info: "Automatically downloads pixiv artwork from provided link",
    credits: "Kenneth Panio"
};

const patterns = {
    pixiv: /https:\/\/www\.pixiv\.net\/en\/artworks\/\d+/g,
    piximg: /https:\/\/i\.pximg\.net\/img-original\/img\/\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d+_p\d+\.\w+/g
};

const cacheDirectory = path.join(__dirname, 'cache');
if (!fs.existsSync(cacheDirectory)) {
    fs.mkdirSync(cacheDirectory);
}

const handleDownloadWithRetry = async (link, chat, retries = 5) => {
    let attempt = 0;
    let success = false;
    const cookie = "67810484_P1M4FikP106UZ8JWwOtQCVqi7VYVarW4";
    while (attempt < retries && !success) {
        try {
            console.log(`Attempt ${attempt + 1} to download media with cookie.`);
            await handleDownload(link, chat, cookie); 
            success = true; 
            console.log('Download succeeded with cookie.');
        } catch (error) {
            attempt++;
            console.log(`Error downloading media (attempt ${attempt} with cookie): ${error.message}`);
            if (attempt >= retries) {
                console.log("Failed to download after 5 attempts with cookie. Trying without cookie...");
                await handleDownload(link, chat, '');
                success = true;
            } else {
                console.log(`Retrying... (${attempt}/${retries}) with cookie.`);
            }
        }
    }
};

const handleDownload = async (link, chat, cookie) => {
    let result;
    if (patterns.piximg.test(link)) {
        return chat.reply({ attachment: await chat.stream(link) });
    }

    if (patterns.pixiv.test(link)) {
        result = cookie 
            ? await nexo.pixiv(link, cookie)
            : await nexo.pixiv(link);
    } else {
        throw new Error('Unsupported URL');
    }

    if (result && result.data && result.data.result) {
        const mediaFiles = result.data.result;
        if (mediaFiles.length > 0) {
            console.log('PIXIV ARTWORK DOWNLOADING...');

            const mediaPromises = mediaFiles.map(media =>
                streamFile(media.buffer, media.type, chat)
            );

            const allMedia = await Promise.all(mediaPromises);
            await chat.reply({ attachment: allMedia });
        } else {
            throw new Error('No media found.');
        }
    } else {
        throw new Error('Failed to retrieve media.');
    }
};


const streamFile = async (buffer, filetype, chat) => {
    try {

        const filePath = path.join(__dirname, 'cache', `media_${Date.now()}.${filetype}`);


        fs.writeFileSync(filePath, buffer);

        return fs.createReadStream(filePath);
    } catch (error) {
        console.log(`Error processing file: ${error.message}`);
    }
};

module.exports["handleEvent"] = async ({
    chat, event, font
}) => {
    const message = event.body;
    if (!message) return;

    const urlRegex = Object.values(patterns).reduce((acc, regex) => acc + `|(${regex.source})`, '').slice(1);
    const regex = new RegExp(urlRegex, 'g');
    let match;

    while ((match = regex.exec(message)) !== null) {
        await chat.reply(font.thin("PIXIV ARTWORK LINK DETECTED!"));
        await handleDownloadWithRetry(match[0], chat, 5);
    }
};

module.exports["run"] = async ({
    chat, font
}) => {
    chat.reply(font.thin("This is an event process that automatically downloads Artworks from Pixiv. Just send me the link, and I will download it directly."));
};
