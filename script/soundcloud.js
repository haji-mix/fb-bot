
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const SoundCloud = require('soundcloud-scraper');
const apiKeyPath = path.join(__dirname, 'system', 'apikey.json');

module.exports["config"] = {
    name: "music",
    version: "1.0.0",
    info: "Search music from SoundCloud and send it as an attachment.",
    credits: "Kenneth Panio",
    isPrefix: false,
    role: 0,
    aliases: ['play', 'sing', 'song', 'kanta', 'spotify', 'lyrics', 'lyric', 'lyrist', 'soundcloud', 'sc'],
    usage: '[title]',
};

const userAgents = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 9; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.6 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 10; Pixel 3 XL) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 11_2_3) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Safari/605.1.15"
];

module.exports["run"] = async ({ api, event, args, chat, font }) => {
    const thin = txt => font.thin(txt);
    const musicName = args.join(' ');
    if (!musicName) {
        return chat.reply(thin(`Please provide the title of the music!`));
    }
    const searching = await chat.reply(thin(`🔍 | Searching for "${musicName}"...`));
    let filePath;
    try {
        let apiKey;
        if (fs.existsSync(apiKeyPath)) {
            const apiKeyData = fs.readJsonSync(apiKeyPath);
            apiKey = apiKeyData.apiKey;
        } else {
            apiKey = await SoundCloud.keygen();
            fs.ensureDirSync(path.dirname(apiKeyPath));
            fs.writeJsonSync(apiKeyPath, { apiKey });
        }

        const client = new SoundCloud.Client(apiKey);
        const searchResults = await client.search(musicName, 'track');
        if (!searchResults.length) {
            return chat.reply(thin("Can't find the music you're looking for."));
        }
        const song = searchResults[0];
        if (song?.url) {
        const songInfo = await client.getSongInfo(song.url);
        const stream = await songInfo.downloadProgressive();
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        filePath = path.join(__dirname, 'cache', `${timestamp}_music.mp3`);
        stream.pipe(fs.createWriteStream(filePath)).on('finish', async () => {
            if (fs.statSync(filePath).size > 26214400) {
                fs.unlinkSync(filePath);
                return chat.reply(thin('The file could not be sent because it is larger than 25MB.'));
            }

            if (songInfo?.thumbnail) {
            const icon = await axios.get(songInfo.thumbnail, { responseType: "stream" });
            const thumb = { attachment: icon.data };
            await chat.reply(thumb);
            }

            const message = { body: thin(`${songInfo.title} | by - ${songInfo.author.name}`), attachment: fs.createReadStream(filePath) };
            try {
                const lyrics = await axios.get(atob(`aHR0cHM6Ly9seXJpc3QudmVyY2VsLmFwcC9hcGkv`) + encodeURIComponent(musicName), {
                    headers: { 'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)] }
                }).then(res => res.data.lyrics);
                if (lyrics) await chat.reply(thin(lyrics));
            } catch (error) {
                console.log("Error fetching lyrics:", error.message);
            }
            searching.unsend();
            await chat.reply(message);
        });
        } else {
            chat.reply(thin("404 Not Found!"));
        }
    } catch (error) {
        if (error.message.includes('Invalid ClientID')) {
            const newKey = await SoundCloud.keygen();
            fs.writeJsonSync(apiKeyPath, { apiKey: newKey });
            chat.reply(thin(`New API key generated. Please retry the search!`));
        } else {
            chat.reply(thin(error.message));
        }
    } finally {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
};
