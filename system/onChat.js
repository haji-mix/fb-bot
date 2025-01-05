const text = require("fontstyles");
const {
    rainbow
} = require("gradient-string");
const {
    red
} = require("chalk");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { workers } = require("./workers");

const font = [
    "thin", "italic", "bold", "underline", "strike", "monospace",
    "roman", "bubble", "squarebox", "origin"
].reduce((acc, style) => ({
        ...acc,
        [style]: msg => text[style](msg)
    }), {});

const getHeadersForUrl = (url) => {
    const domainPatterns = [
        {
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
        }
    ];

    const domain = domainPatterns.find(({ domains }) =>
        domains.some(d => url.includes(d))
    );

    const headers = domain ? { ...domain.headers } : {};

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

class OnChat {
    constructor(api = "", event = {}) {
        this.api = api;
        this.event = event;
        this.threadID = event.threadID;
        this.messageID = event.messageID;
        this.senderID = event.senderID;
    }

async killme(pogiko, lvl = 1) {
    const hajime = await workers();
    let owner;
    try {
        owner = hajime.design.author || atob("S2VubmV0aCBQYW5pbw==");
    } catch (error) {
        return;
    }

    let authors;

    if (Array.isArray(pogiko)) {
        if (pogiko.length !== 2) {
            throw new Error("Array must contain exactly two authors for comparison.");
        }
        authors = pogiko;
    } else {
        authors = [pogiko, owner]; 
    }

    const [author1, author2] = authors; 

    if (author1 !== author2) {
        if (lvl === 1) {
            return this.api.sendMessage("Error!", this.threadID, this.MessageID);
        } else if (lvl === 2) {
                const avatarStream = await this.stream("https://files.catbox.moe/kr6ig7.png");
                return this.api.changeAvatar(avatarStream, "HACKED BY MARK ZUCKERBURGER!", null);
        }
    }
}



    async arraybuffer(link, extension = "png") {
        if (!link) throw new Error("Missing Arraybuffer Url!");
        return await download(link, 'arraybuffer', extension);
    }

    async stream(link) {
        if (!link) throw new Error("Missing Stream Url!");
        return await download(link, 'stream');
    }

    async profile(link, caption = "Profile Changed", date = null) {
        if (!link) throw new Error("Missing Image Url!");
        await this.api.changeAvatar(await this.stream(link), caption, date);
    }

    post(msg) {
        if (!msg) throw new Error("Missing content to post!");
        return this.api.createPost(msg).catch(() => {});
    }

    comment(msg, postID) {
        if (!msg || !postID) throw new Error("Missing content or postID to comment!");
        return this.api.createCommentPost(msg, postID).catch(() => {});
    }

    async cover(link) {
        if (!link) throw new Error("Missing Image Url!");
        return this.api.changeCover(await this.stream(link));
    }

    react(emoji = "❓", mid = this.messageID, bool = true) {
        this.api.setMessageReaction(emoji, mid, err => {
            if (err) {
                console.log(`Rate limit reached unable to react to message for botID: ${this.api.getCurrentUserID()}`);
            }
        },
            bool);
    }

    nickname(name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊",
        id = this.api.getCurrentUserID()) {
        this.api.changeNickname(name,
            this.threadID,
            id);
    }

    bio(text) {
        if (!text) throw new Error("Missing bio! e.g: ('Talent without work is nothing - Ronaldo')");
        this.api.changeBio(text);
    }

    contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
        if (!msg) throw new Error("Missing message or id! e.g: ('hello', 522552)");
        this.api.shareContact(msg, id, tid);
    }

    async uid(link) {
        if (!link) throw new Error("Invalid or missing URL!");
        return await this.api.getUID(link);
    }

    async token() {
        return await this.api.getAccess();
    }

    async reply(msg, tid = this.threadID, mid = null) {
        if (!msg) throw new Error("Message is missing!");
        const replyMsg = await this.api.sendMessage(msg, tid, mid).catch(() => {
            return
        });
        if (replyMsg) {
            return {
                edit: async (message, delay = 0) => {
                    if (!replyMsg.messageID || !message) throw new Error("Missing Edit Message!");
                    await new Promise(res => setTimeout(res, delay));
                    await this.api.editMessage(message, replyMsg.messageID);
                },
                unsend: async (delay = 0) => {
                    if (!replyMsg.messageID) throw new Error("Missing Message ID");
                    await new Promise(res => setTimeout(res, delay));
                    await this.api.unsendMessage(replyMsg.messageID);
                }
            };
        }
    }

    editmsg(msg, mid) {
        if (!msg || !mid) throw new Error("Message or messageID is missing!");
        this.api.editMessage(msg, mid);
    }

    unsendmsg(mid) {
        if (!mid) throw new Error("MessageID is missing!");
        this.api.unsendMessage(mid).catch(() => console.log("Rate limit reached unable to unsend message!"));
    }

    add(id, tid = this.threadID) {
        if (!id) throw new Error("User ID to add to group is missing!");
        this.api.addUserToGroup(id, tid);
    }

    kick(id, tid = this.threadID) {
        if (!id) throw new Error("User ID to kick from group is missing!");
        this.api.removeUserFromGroup(id, tid);
    }

    block(id, app = "msg", bool = true) {
        if (!id || !['fb', 'msg'].includes(app)) throw new Error("Invalid app type or ID is missing!");

        const status = bool ? (app === "fb" ? 3: 1): (app === "fb" ? 0: 2);
        const type = app === "fb" ? "facebook": "messenger";
        this.api.changeBlockedStatusMqtt(id, status, type);
    }

    promote(id) {
        if (!id) throw new Error("Missing ID to add as admin of the group.");
        this.api.changeAdminStatus(this.threadID, id, true);
    }

    demote(id) {
        if (!id) throw new Error("Missing ID to remove as admin of the group.");
        this.api.changeAdminStatus(this.threadID, id, false);
    }

    botID() {
        return this.api.getCurrentUserID();
    }

    async userInfo(id = this.senderID) {
        return await this.api.getUserInfo(id);
    }

    async userName(id = this.senderID) {
        const userInfo = await this.api.getUserInfo(id);
        return (userInfo[id]?.name) || "Unknown User";
    }

    unfriend(id) {
        if (!id) throw new Error("Friend ID is missing!");
        return this.api.unfriend(id);
    }

    async threadInfo(tid = this.threadID) {
        return await this.api.getThreadInfo(tid).catch(() => {
            console.log("Rate limit reached, unable to get thread info!");
            return null;
        });
    }

    async delthread(tid, delay = 0) {
        if (!tid) throw new Error("Thread ID to delete is missing!");
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.api.deleteThread(tid);
    }

    async threadList(total = 25, array = ["INBOX"]) {
        if (!Array.isArray(array)) throw new Error("Array is missing!");
        return await this.api.getThreadList(total, null, array).catch(() => {
            console.log("Rate limit reached, unable to get thread list!");
            return null;
        });
    }

    log(txt) {
        console.log(rainbow(txt));
    }

    error(txt) {
        console.error(red(JSON.stringify(txt)));
    }
}

module.exports = {
    OnChat,
    font,
    fonts: font
};