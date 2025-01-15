const axios = require('axios');
const xml2js = require('xml2js');
const randomUseragent = require('random-useragent');

module.exports["config"] = {
    name: "rule34",
    credits: 'atomic-zero',
    version: "1.0.0",
    info: 'Fetches a random picture from Rule34.xxx API and provides information about it.',
    type: 'image-fetch',
    usage: "[tags]",
    guide: "Rule34 raiden shogun,genshin impact\nRule34 raiden shogun#genshin impact\nRule34 raiden shogun|genshin impact\n\nResults: Rating: q\nTags: ass genshin_impact naked nipples raiden_shogun tem10 thighhighs\nSource: https: //tem10.gumroad.com/l/ghubq\nAuthor: Arsy\n\nBody: Ugh Yamete Kudasai!\nAttachment: <image>",
    aliases: ["r34"],
    role: 0,
    cd: 10
};

function parseXMLData(xmlData) {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xmlData, {
            explicitArray: false
        }, (err, result) => {
            if (err) {
                reject(err);
            } else {
                const posts = result.posts.post;
                resolve(posts);
            }
        });
    });
}

module.exports["run"] = async function({
    chat, args, font, event, global
}) {

    const {
        messageID
    } = event;

    const tags = args.join('_').replace(/,|\||#|\+/g, ' ');

    let tagsOpt = '';
    if (tags) {
        tagsOpt = `&tags=${encodeURIComponent(tags)}`;
    }

    const infoMSG = await chat.reply(font.thin("Fetching Rule 34 Image..."));

    try {

        const userAgent = randomUseragent.getRandom();

        const response = await axios.get(global.api["booru"][1] + `?page=dapi&s=post&q=index&limit=100${tagsOpt}`, {
            headers: {
                'User-Agent': userAgent
            }
        });

        const xmlData = response.data;
        const posts = await parseXMLData(xmlData);

        if (!posts || posts.length === 0) {
            chat.reply(font.italic("No images found for the provided tags."));
            return;
        }

        const randomIndex = Math.floor(Math.random() * posts.length);
        const post = posts[randomIndex];

        const {
            file_url,
            rating,
            tags: r34tags,
            source = 'https://www.facebook.com/100081201591674',
            creator_id = 'Kenneth Panio'
        } = post.$;

        const infoMessage = font.thin(`RATED: ${rating?.toUpperCase()}\nTAGS: ${r34tags}\nAUTHOR: ${creator_id}\nSOURCE: `) + source;

        infoMSG.unsend(60000);

        infoMSG.edit(infoMessage, 5000);

        if (file_url) {
            const imageResponse = await axios.get(file_url, {
                responseType: "stream"
            });

            if (imageResponse.status === 200 && imageResponse.data) {
                const booru = await chat.reply({
                    body: "𝚁𝚄𝙻𝙴34 𝙸𝙼𝙰𝙶𝙴",
                    attachment: imageResponse.data,
                });
                booru.unsend(60000);
            } else {
                infoMSG.edit(font.thin("Image is no longer available, was deleted by the author."));
            }
        } else {
            infoMSG.edit(font.thin("Image URL not valid or missing."));
        }
    } catch (error) {
        infoMSG.edit(font.thin(error.message));
    }
};