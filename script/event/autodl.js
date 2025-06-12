module.exports.config = {
    name: "autodl",
    description: "Auto-download detected video links",
    version: "1.0.0",
    role: 0,
    author: "Kenneth Panio"
};

const PLATFORMS = {
    youtube: { regex: /https:\/\/(?:www\.)?(?:youtube\.[a-z.]+\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/, name: 'YouTube' },
    tiktok: { regex: /https:\/\/(www\.)?[a-z]{2}\.tiktok\.[a-z.]+\/[a-zA-Z0-9-_]+\/?/, name: 'TikTok' },
    instagram: { regex: /https:\/\/(?:www\.)?instagram\.com\/(?:p|reel|tv)\/[a-zA-Z0-9_-]+\/?/, name: 'Instagram' },
    facebook: { regex: /https:\/\/www\.facebook\.com\/(?:watch\/?\?v=\d+|(?:\S+\/videos\/\d+)|(?:reel\/\d+)|(?:share\/\S+))(?:\?\S+)?/, name: 'Facebook' },
};

module.exports.handleEvent = async ({ chat, event }) => {
    const links = event.body.match(/https?:\/\/[^\s]+/g) || [];
    
    for (const link of links) {
        for (const [_, { regex, name }] of Object.entries(PLATFORMS)) {
            if (regex.test(link)) {
                await chat.reply({
                    body: name,
                    attachment: `https://www.haji-mix-api.gleeze.com/api/autodl?url=${link}&stream=true`
                });
                return;
            }
        }
    }
};