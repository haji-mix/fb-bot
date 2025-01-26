const axios = require('axios');
const { google } = require('googleapis');
const mime = require('mime-types');
const getFBInfo = require('@xaviabot/fb-downloader');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "autodl",
    version: "69",
    info: "Automatically downloads video URLs or file URLs and sends them as attachments",
    credits: "Hutchin (optimized by Kenneth Panio)"
};

// User activity tracking to prevent spam
const userActivity = new Map();
const TIME_FRAME = 30000; // 30 seconds
const MAX_LINKS = 3; // Max allowed links per timeframe

const checkSpam = (userId) => {
    const now = Date.now();
    if (!userActivity.has(userId)) {
        userActivity.set(userId, [now]);
        return false;
    }

    const timestamps = userActivity.get(userId).filter((ts) => now - ts <= TIME_FRAME);
    timestamps.push(now);
    userActivity.set(userId, timestamps);

    return timestamps.length > MAX_LINKS;
};

// Function to stream files to chat
const streamFile = async (url, chat) => {
    try {
        const { data } = await axios.get(url, { responseType: 'stream' });
        chat.reply({ attachment: data });
    } catch (error) {
        console.error(`Failed to stream file:`, error.message);
    }
};

// TikTok handler
const handleTikTok = async (link, chat, mono) => {
    try {
        const { data } = await axios.post('https://www.tikwm.com/api/', { url: link });
        if (!data.data?.play) throw new Error('Invalid response from TikTok API');
        
        chat.reply(mono(
            `TikTok Video Detected!\n\n` +
            `Title: ${data.data.title}\n` +
            `Views: ${data.data.play_count}\n` +
            `Likes: ${data.data.digg_count}\n` +
            `Comments: ${data.data.comment_count}`
        ));

        await streamFile(data.data.play, chat);
    } catch (error) {
        console.error(`TikTok error:`, error.message);
    }
};

// Facebook handler
const handleFacebook = async (link, chat, mono) => {
    try {
        const result = await getFBInfo(link);
        chat.reply(mono(`Facebook Video Detected!\n\nTitle: ${result.title}`));
        await streamFile(result.sd || result.hd, chat);
    } catch (error) {
        console.error(`Facebook error:`, error.message);
    }
};

// Event handler
module.exports["handleEvent"] = async ({ chat, event, font }) => {
    const mono = (txt) => font.monospace(txt);
    const message = event.body;
    const userId = event.senderID;

    if (!message) return;

    const regexPatterns = {
        tiktok: /https:\/\/(www\.)?vt\.tiktok\.com\/[a-zA-Z0-9-_]+\/?/g,
        facebook: /https:\/\/www\.facebook\.com\/(?:watch|reel|videos|groups\/\d+\/permalink|share\/r|(?:\d+\/)?posts)\/\S+/g
    };

    const links = [];
    for (const [type, regex] of Object.entries(regexPatterns)) {
        let match;
        while ((match = regex.exec(message)) !== null) {
            links.push({ type, link: match[0] });
        }
    }

    if (links.length === 0) return;

    if (checkSpam(userId)) {
        const warning = await chat.reply(mono(
            "You're sending too many links in a short period. Please slow down."
        ));
        warning.unsend(10000);
        return;
    }

    for (const { type, link } of links.slice(0, MAX_LINKS)) {
        try {
            const handlers = {
                tiktok: handleTikTok,
                facebook: handleFacebook,
            };

            if (handlers[type]) {
                await handlers[type](link, chat, mono);
            }
        } catch (error) {
            console.error(`Error processing ${type} link:`, error.message);
        }
    }
};

module.exports["run"] = async ({ chat, font }) => {
    const mono = (txt) => font.monospace(txt);
    chat.reply(mono(
        "This bot automatically downloads videos from TikTok, Facebook, and other supported platforms. " +
        "Send me a link, and I'll handle the rest!"
    ));
};
