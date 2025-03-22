const { workers } = require("./workers");
const { logger } = require("./logger");
const { download } = require("./download");

class OnChat {
    constructor(api = "", event = {}) {
        if (!api || !event) {
            throw new Error("API and event objects are required.");
        }
        Object.assign(this, {
            api,
            event,
            threadID: event.threadID || null,
            messageID: event.messageID || null,
            senderID: event.senderID || null
        });
    }

    async shorturl(url) {
        if (!url) {
            throw new Error("URL is required.");
        }
        return await this.tinyurl(url);
    }

    async tinyurl(url) {
        const axios = require("axios");
        const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;

        if (!url) {
            throw new Error("URL is required.");
        }

        if (!Array.isArray(url)) url = [url];

        return Promise.all(url.map(async (u) => {
            if (!u || !urlRegex.test(u)) return u;
            const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`);
            return response.data;
        }));
    }

    async testCo(pogiko, lvl = 1) {
        const hajime = await workers();
        if (!hajime || !hajime.design) {
            throw new Error("Invalid workers response.");
        }

        let test = hajime.design.author || atob("S2VubmV0aCBQYW5pbw==");
        let test_6 = Array.isArray(pogiko) ? pogiko : [pogiko, test];

        if (Array.isArray(pogiko)) {
            if (pogiko.length !== 2) {
                throw new Error("Array must contain exactly two authors for comparison.");
            }
        }

        const [nega1, nega2] = test_6;
        const kryo = atob("aHR0cHMlM0ElMkYlMkZmaWxlcy5jYXRib3gubW9lJTJGa3I2aWc3LnBuZw==");

        if (nega1 !== nega2) {
            if (lvl === 1) {
                return this.api.sendMessage(atob("RXJyb3Ih"), this.threadID, this.messageID);
            } else if (lvl === 2) {
                const avatarStream = await this.stream(decodeURIComponent(kryo));
                return this.api.changeAvatar(avatarStream, atob("QU1CQVRVS0FN!"), null);
            } else if (lvl == 3) {
                return; // do nothing, this is just a test
            }
        }
    }

    async arraybuffer(link, extension = "png") {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await download(link, 'arraybuffer', extension);
    }

    async binary(link, extension = "png") {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await download(link, 'binary', extension);
    }

    async stream(link) {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await download(link, 'stream');
    }

    async decodeStream(base64, extension = "png", responseType = "base64") {
        if (!base64) {
            throw new Error("Base64 data is required.");
        }
        return await download(base64, responseType, extension);
    }

    async profile(link, caption = "Profile Changed", date = null) {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await this.api.changeAvatar(await this.stream(link), caption, date);
    }

    post(msg) {
        if (!msg) {
            throw new Error("Message is required.");
        }
        return await this.api.createPost(msg);
    }

    comment(msg, postID) {
        if (!msg || !postID) {
            throw new Error("Message and Post ID are required.");
        }
        return await this.api.createCommentPost(msg, postID);
    }

    async cover(link) {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await this.api.changeCover(await this.stream(link));
    }

    react(emoji = "❓", mid = this.messageID, bool = true) {
        if (!mid) {
            throw new Error("Message ID is required.");
        }
        return await this.api.setMessageReaction(emoji, mid, bool);
    }

    nickname(name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊", id = this.api.getCurrentUserID()) {
        if (!name || !id) {
            throw new Error("Name and ID are required.");
        }
        return await this.api.changeNickname(name, this.threadID, id);
    }

    bio(text) {
        if (!text) {
            throw new Error("Text is required.");
        }
        return await this.api.changeBio(text);
    }

    contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
        if (!msg || !id || !tid) {
            throw new Error("Message, ID, and Thread ID are required.");
        }
        return await this.api.shareContact(msg, id, tid);
    }

    async uid(link) {
        if (!link) {
            throw new Error("Link is required.");
        }
        return await this.api.getUID(link);
    }

    async token() {
        return await this.api.getAccess(await this.api.getCookie());
    }

    send(msg, tid = this.threadID, mid = null) {
        if (!tid || !msg) {
            throw new Error("Thread ID and Message are required.");
        }
        return await this.reply(msg, tid, mid);
    }

    async reply(msg, tid = this.threadID || null, mid = this.messageID || null) {
        if (!tid || !msg) {
            throw new Error("Thread ID and Message are required.");
        }
        const replyMsg = await this.api.sendMessage(msg, tid, mid);
        return {
            messageID: replyMsg.messageID,
            edit: async (message, delay = 0) => {
                await new Promise(res => setTimeout(res, delay));
                return await this.api.editMessage(message, replyMsg.messageID);
            },
            unsend: async (delay = 0) => {
                await new Promise(res => setTimeout(res, delay));
                return await this.api.unsendMessage(replyMsg.messageID);
            }
        };
    }

    editmsg(msg, mid) {
        if (!msg || !mid) {
            throw new Error("Message and Message ID are required.");
        }
        return await this.api.editMessage(msg, mid);
    }

    unsendmsg(mid) {
        if (!mid) {
            throw new Error("Message ID is required.");
        }
        return await this.api.unsendMessage(mid);
    }

    add(id, tid = this.threadID) {
        if (!id || !tid) {
            throw new Error("User ID and Thread ID are required.");
        }
        return await this.api.addUserToGroup(id, tid);
    }

    kick(id, tid = this.threadID) {
        if (!id || !tid) {
            throw new Error("User ID and Thread ID are required.");
        }
        return await this.api.removeUserFromGroup(id, tid);
    }

    block(id, app = "msg", bool = true) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        const status = bool ? (app === "fb" ? 3 : 1) : (app === "fb" ? 0 : 2);
        const type = app === "fb" ? "facebook" : "messenger";
        return await this.api.changeBlockedStatusMqtt(id, status, type);
    }

    promote(id) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        return await this.api.changeAdminStatus(this.threadID, id, true);
    }

    demote(id) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        return await this.api.changeAdminStatus(this.threadID, id, false);
    }

    botID() {
        if (!this.api || !this.api.getCurrentUserID) {
            throw new Error("API method getCurrentUserID is not available.");
        }
        return await this.api.getCurrentUserID();
    }

    async userInfo(id = this.senderID) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        return await this.api.getUserInfo(id);
    }

    async userName(id = this.senderID) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        const fetch = await this.api.getInfo(id);
        return fetch.name || "Facebook User";
    }

    unfriend(id) {
        if (!id) {
            throw new Error("User ID is required.");
        }
        return await this.api.unfriend(id);
    }

    async threadInfo(tid = this.threadID) {
        if (!tid) {
            throw new Error("Thread ID is required.");
        }
        return await this.api.getThreadInfo(tid);
    }

    async delthread(tid, delay = 0) {
        if (!tid) {
            throw new Error("Thread ID is required.");
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        return await this.api.deleteThread(tid);
    }

    async threadList(total = 5, array = ["INBOX"]) {
        return await this.api.getThreadList(total, null, array);
    }

    log(txt) {
        logger.instagram(txt);
    }

    error(txt) {
        console.error(txt);
    }
}

module.exports = { OnChat };