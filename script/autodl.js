const axios = require('axios');
const { google } = require('googleapis');
const mime = require('mime-types');
const getFBInfo = require("@xaviabot/fb-downloader");
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "autodl",
    version: "69",
    info: "Automatically downloads video URLs or file URLs and sends them as attachments",
    credits: "Hutchin (optimized by Kenneth Panio)"
};

const streamFile = async (url, chat) => {
    const { data } = await axios.get(url, { responseType: 'stream' });
    chat.reply({ attachment: data });
};

const handleTikTok = async (link, chat, mono) => {
    const { data } = await axios.post('https://www.tikwm.com/api/', { url: link });
    if (!data.data?.play) throw new Error('Invalid response from TikTok API');
    await chat.reply(mono(`TikTok Video Link Detected!\n\nContent: ${data.data.title}\n\nLikes: ${data.data.digg_count}\n\nComments: ${data.data.comment_count}\n\nDownload link: ${data.data.play}.`));
    await streamFile(data.data.play, chat);
};

const handleGoogleDrive = async (link, chat, apiKey, mono) => {
    const drive = google.drive({ version: 'v3', auth: apiKey });
    const fileId = link.match(/(?:file\/d\/|open\?id=)([\w-]{33}|\w{19})/)[1];
    const { data } = await drive.files.get({ fileId, fields: 'name, mimeType' });
    const destPath = path.join(__dirname, `${data.name}${mime.extension(data.mimeType) || ''}`);
    const dest = fs.createWriteStream(destPath);
    const resMedia = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
    resMedia.data.pipe(dest);
    chat.reply(mono(`Google Drive Link\n\nFilename: ${data.name}`));

    dest.on('finish', async () => {
        await chat.reply({ attachment: dest });
        fs.unlinkSync(destPath);
    });
};

const handleYouTube = async (link, chat, mono) => {
    const html = (await axios.get(`https://www.helloconverter.com/download?url=${link}&token=665bd17a47ad721615f5dedd7b173f186abca42b8e1cfd0f3a4873e8372d0bb6`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    })).data;
    const $ = cheerio.load(html);
    const video = $('td.t-content1').map((_, el) => ({
        resolution: $(el).text().trim(),
        size: $(el).next().next().text().trim(),
        downloadUrl: $(el).next().next().next().find('a').attr('href')
    })).get()[0];
    if (video) {
        await chat.reply(mono(`YouTube Video Link Detected!\n\nResolution: ${video.resolution}\n\nSize: ${video.size}`));
        await streamFile(video.downloadUrl, chat);
    }
};

const handleFacebook = async (link, chat, mono) => {
    const result = await getFBInfo(link);
    await chat.reply(mono(`Facebook Video Link Detected!\n\nContent: ${result.title}`));
    await streamFile(result.sd, chat);
};

module.exports["handleEvent"] = async ({ chat, event, font }) => {
    const mono = (txt) => font.monospace(txt);
    const message = event.body;
    if (!message) return;

    const apiKey = 'AIzaSyCYUPzrExoT9f9TsNj7Jqks1ZDJqqthuiI';
    const regexPatterns = {
        tiktok: /https:\/\/(www\.)?vt\.tiktok\.com\/[a-zA-Z0-9-_]+\/?/g,
        drive: /https?:\/\/(www\.)?drive\.google\.com\/(file\/d\/|open\?id=)/g,
        facebook: /https:\/\/www\.facebook\.com\/(?:watch\/?\?v=\d+|(?:\S+\/videos\/\d+)|(?:reel\/\d+)|(?:share\/\S+))(?:\?\S+)?/g,
        youtube: /https:\/\/(www\.)?(youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)/g
    };

    // Collect links for batch processing
    const links = [];
    for (const [key, regex] of Object.entries(regexPatterns)) {
        let match;
        while ((match = regex.exec(message)) !== null) {
            links.push({ type: key, link: match[0] });
        }
    }

    if (links.length === 0) return; 
    const limitedLinks = links.slice(0, 3);

    for (const { type, link } of limitedLinks) {
        try {
            const handlers = {
                tiktok: handleTikTok,
                drive: handleGoogleDrive,
                facebook: handleFacebook,
                youtube: handleYouTube
            };
            await handlers[type](link, chat, type === 'drive' ? apiKey : mono);
        } catch (error) {
            chat.log(`Error processing ${type} link: ${error.message}`);
        }
    }
};

module.exports["run"] = async ({ chat, font }) => {
    const mono = (txt) => font.monospace(txt);
    chat.reply(mono("This is an event process that automatically downloads videos from YouTube, TikTok, and Facebook. Just send me the link, and I will download it directly."));
};
