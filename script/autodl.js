const axios = require('axios');
const { google } = require('googleapis');
const mime = require('mime-types');
const getFBInfo = require('@xaviabot/fb-downloader');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "autodl",
    version: "69",
    info: "Automatically downloads video URLs or file URLs and sends them as attachments",
    credits: "Hutchin (optimized by Kenneth Panio)"
};

const userActivity = new Map();
const timeFrame = 30000; // 30 seconds
const maxLinks = 3; // Max allowed links per timeframe

const checkSpam = (userId) => {
    const now = Date.now();
    if (!userActivity.has(userId)) {
        userActivity.set(userId, [now]);
        return false;
    }

    const timestamps = userActivity.get(userId).filter((ts) => now - ts <= timeFrame);
    timestamps.push(now);
    userActivity.set(userId, timestamps);

    return timestamps.length > maxLinks;
};

const streamFile = async (url, chat) => {
    try {
        const { data } = await axios.get(url, { responseType: 'stream' });
        chat.reply({ attachment: data });
    } catch (error) {
        console.error(`Failed to stream file: `, error);
    }
};

const handleTikTok = async (link, chat, mono) => {
    try {
        const { data } = await axios.post('https://www.tikwm.com/api/', { url: link });
        if (!data.data?.play) throw new Error('Invalid response from TikTok API');
        chat.reply(mono(`TikTok Video Detected!\n\nTitle: ${data.data.title}\n\nLikes: ${data.data.digg_count}\n\nComments: ${data.data.comment_count}.`));
        await streamFile(data.data.play, chat);
    } catch (error) {
        console.error(`TikTok error: `, error);
    }
};

const handleGoogleDrive = async (link, chat, apiKey, mono) => {
    try {
        const drive = google.drive({ version: 'v3', auth: apiKey });
        const fileId = link.match(/(?:file\/d\/|open\?id=)([\w-]+)/)[1];
        const { data } = await drive.files.get({ fileId, fields: 'name, mimeType' });
        const destPath = path.join(__dirname, `${data.name}.${mime.extension(data.mimeType) || ''}`);
        const dest = fs.createWriteStream(destPath);
        const resMedia = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });
        resMedia.data.pipe(dest);

        chat.reply(mono(`Google Drive Link Detected!\n\nFilename: ${data.name}`));
        dest.on('finish', async () => {
            await chat.reply({ attachment: fs.createReadStream(destPath) });
            fs.unlinkSync(destPath);
        });
    } catch (error) {
        console.error(`Google Drive error: `, error);
    }
};

const handleYouTube = async (link, chat, mono) => {
    try {
        const html = (await axios.get(`https://www.helloconverter.com/download?url=${link}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        })).data;
        const $ = cheerio.load(html);
        const video = $('td.t-content1').map((_, el) => ({
            resolution: $(el).text().trim(),
            size: $(el).next().next().text().trim(),
            downloadUrl: $(el).next().next().next().find('a').attr('href')
        })).get()[0];

        if (video) {
            chat.reply(mono(`YouTube Video Detected!\n\nResolution: ${video.resolution}\n\nSize: ${video.size}`));
            await streamFile(video.downloadUrl, chat);
        }
    } catch (error) {
        console.error(`YouTube error: `, error);
    }
};

const handleFacebook = async (link, chat, mono) => {
    try {
        const result = await getFBInfo(link);
        chat.reply(mono(`Facebook Video Detected!\n\nTitle: ${result.title}`));
        await streamFile(result.sd, chat);
    } catch (error) {
        console.error(`Facebook error: `, error);
    }
};

module.exports["handleEvent"] = async ({ chat, event, font }) => {
    const mono = (txt) => font.monospace(txt);
    const message = event.body;
    const userId = event.senderID;

    if (!message) return;

    const apiKey = 'AIzaSyCYUPzrExoT9f9TsNj7Jqks1ZDJqqthuiI';
    const regexPatterns = {
        tiktok: /https:\/\/(www\.)?vt\.tiktok\.com\/[a-zA-Z0-9-_]+\/?/g,
        drive: /https?:\/\/(www\.)?drive\.google\.com\/(file\/d\/|open\?id=)/g,
        facebook: /https:\/\/www\.facebook\.com\/(?:watch|reel|videos)\/\S+/g,
        youtube: /https:\/\/(www\.)?(youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)/g
    };

    const links = [];
    for (const [key, regex] of Object.entries(regexPatterns)) {
        let match;
        while ((match = regex.exec(message)) !== null) {
            links.push({ type: key, link: match[0] });
        }
    }

    if (links.length === 0) return;

    if (checkSpam(userId)) {
        const warning = await chat.reply(mono("You're sending too many links in a short period. Please slow down."));
        warning.unsend(10000);
        return;
    }

    for (const { type, link } of links.slice(0, maxLinks)) {
        try {
            const handlers = {
                tiktok: handleTikTok,
                drive: handleGoogleDrive,
                facebook: handleFacebook,
                youtube: handleYouTube
            };
            await handlers[type](link, chat, type === 'drive' ? apiKey : mono);
        } catch (error) {
            console.error(`Error processing ${type} link: `, error);
        }
    }
};

module.exports["run"] = async ({ chat, font }) => {
    const mono = (txt) => font.monospace(txt);
    chat.reply(mono("This is an event process that automatically downloads videos from YouTube, TikTok, Facebook, and Google Drive. Send me a link, and I'll handle the rest!"));
};
