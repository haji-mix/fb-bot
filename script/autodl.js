const axios = require('axios');
const {
    google
} = require('googleapis');
const mime = require('mime-types');
const getFBInfo = require('@xaviabot/fb-downloader');
const qs = require('qs');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "autodl",
    version: "69",
    info: "Automatically downloads video URLs or file URLs and sends them as attachments",
    credits: "Kenneth Panio"
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

const extractVideoId = (url) => {
    const youtubeRegex = /https:\/\/(?:www\.)?(?:youtube\.com\/(?:(?:watch\?v=)|(?:embed\/)|(?:shorts\/)|(?:playlist\?list=))|youtu\.be\/)([a-zA-Z0-9_-]+)(?:[\S]*)?/;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
        return match[1];
    }
    return null;
};

const extractCookiesAndCsrf = async () => {
    const url = "https://en.y2mate.is/x107/";

    try {
        const response = await axios.get(url, {
            headers: {
                "User-Agent": randomUseragent.getRandom()
            }
        });

        if (response.status === 200) {
            const $ = cheerio.load(response.data);
            const csrfToken = $('meta[name="csrf-token"]').attr('content');
            const cookies = response.headers['set-cookie'];

            return {
                cookies,
                csrfToken
            };
        } else {
            console.error("Failed to retrieve cookies or CSRF token.");
            return {
                cookies: null,
                csrfToken: null
            };
        }
    } catch (error) {
        console.error("Error fetching CSRF token:", error.message);
        return {
            cookies: null,
            csrfToken: null
        };
    }
};

const getDownloadLink = async (videoUrl, chat, mono) => {
    const videoId = extractVideoId(videoUrl);

    if (!videoId) {
        console.error("Failed to extract video ID from the URL.");
        return null;
    }

    const {
        cookies,
        csrfToken
    } = await extractCookiesAndCsrf();

    if (!cookies || !csrfToken) {
        console.error("Failed to extract cookies or CSRF token.");
        return null;
    }

    const postUrl = "https://en.y2mate.is/getconvert";

    const data = {
        id: videoId,
        url: videoUrl,
        format: "mp4"
    };

    const headers = {
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-US,en;q=0.5",
        "Connection": "keep-alive",
        "Content-Type": "application/json",
        "Host": "en.y2mate.is",
        "Origin": "https://en.y2mate.is",
        "Referer": "https://en.y2mate.is/x107/",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "User-Agent": randomUseragent.getRandom(),
        "X-CSRF-TOKEN": csrfToken
    };

    try {
        const response = await axios.post(postUrl, data, {
            headers
        });

        if (response.status === 200) {
            const responseJson = response.data;
            const downloadLink = responseJson.download;
            
            if (downloadLink) {
                await convertVideo(videoUrl, chat, mono)
                await streamFile(downloadLink, chat);
                });
            } else {
                console.error("Download link not found in the response.");
            }
        } else {
            console.error(`Request failed with status code ${response.status}`);
        }
    } catch (error) {
        console.error("Error during request:", error.message);
    }
};


const getKey = async () => {
    try {
        const response = await axios.get('https://api.mp3youtube.cc/v2/sanity/key', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
                'sec-ch-ua-platform': '"Android"',
                'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
                'dnt': '1',
                'content-type': 'application/json',
                'sec-ch-ua-mobile': '?1',
                'origin': 'https://iframe.y2meta-uk.com',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://iframe.y2meta-uk.com/',
                'accept-language': 'en-US,en;q=0.9,vi;q=0.8,pt;q=0.7,fr;q=0.6',
                'if-none-match': 'W/"7e-4rfGhS2GaZKwxKqjHvE0scqf4Qc-gzip"',
                'priority': 'u=1, i'
            }
        });
        return response.data.key;
    } catch (error) {
        console.error("Error fetching key:", error.response ? error.response.data: error.message);
        return null;
    }
};

const convertVideo = async (url, chat, mono) => {
    const key = await getKey();
    if (!key) return;

    const data = qs.stringify({
        "link": url,
        "format": 'mp4',
        "audioBitrate": '128',
        "videoQuality": '360',
        "vCodec": 'h264'
    });

    try {
        const response = await axios.post('https://api.mp3youtube.cc/v2/converter', data, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Mobile Safari/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
                'sec-ch-ua-platform': '"Android"',
                'sec-ch-ua': '"Not A(Brand";v="8", "Chromium";v="132", "Google Chrome";v="132"',
                'sec-ch-ua-mobile': '?1',
                'key': key,
                'dnt': '1',
                'origin': 'https://iframe.y2meta-uk.com',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-mode': 'cors',
                'sec-fetch-dest': 'empty',
                'referer': 'https://iframe.y2meta-uk.com/',
                'accept-language': 'en-US,en;q=0.9,vi;q=0.8,pt;q=0.7,fr;q=0.6',
                'priority': 'u=1, i'
            }
        });

        chat.reply(mono(`Youtube Video link Detected\n\nContent:${response.data.filename}`
        ));

        //    await streamFile(response.data.url, chat);
    } catch (error) {
        console.error("Error converting video:", error.response ? error.response.data: error.message);
    }
};


const streamFile = async (url, chat) => {
    try {
        chat.reply({
            attachment: await chat.arraybuffer(url, "mp4")
        });
    } catch (error) {
        console.error(`Failed to stream file:`, error.message);
    }
};

// TikTok handler
const handleTikTok = async (link, chat, mono) => {
    try {
        const {
            data
        } = await axios.post('https://www.tikwm.com/api/', {
                url: link
            });
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
module.exports["handleEvent"] = async ({
    chat, event, font
}) => {
    const mono = (txt) => font.monospace(txt);
    const message = event.body;
    const userId = event.senderID;

    if (!message) return;

    const regexPatterns = {
        tiktok: /https:\/\/(www\.)?[a-z]{2}\.tiktok\.com\/[a-zA-Z0-9-_]+\/?/g,
        facebook: /https:\/\/www\.facebook\.com\/(?:[a-zA-Z0-9-_\/]+\/[a-zA-Z0-9-_]+\/?|watch|reel|videos|groups\/\d+\/permalink|posts|.+\/videos\/\d+).*/g,
        youtube: /https:\/\/(?:www\.)?(youtube\.com\/(?:watch\?v=|embed\/|shorts\/|playlist\?list=)|youtu\.be\/)([a-zA-Z0-9_-]+)(?:\?[\S]*)?/g
    };


    const links = [];
    for (const [type, regex] of Object.entries(regexPatterns)) {
        let match;
        while ((match = regex.exec(message)) !== null) {
            links.push({
                type, link: match[0]
            });
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

    for (const {
        type, link
    } of links.slice(0, MAX_LINKS)) {
        try {
            const handlers = {
                tiktok: handleTikTok,
                facebook: handleFacebook,
                youtube: getDownloadLink,
            };

            if (handlers[type]) {
                await handlers[type](link, chat, mono);
            }
        } catch (error) {
            console.error(`Error processing ${type} link:`, error.message);
        }
    }
};

module.exports["run"] = async ({
    chat, font
}) => {
    const mono = (txt) => font.monospace(txt);
    chat.reply(mono(
        "This bot automatically downloads videos from TikTok, Facebook, and other supported platforms. " +
        "Send me a link, and I'll handle the rest!"
    ));
};