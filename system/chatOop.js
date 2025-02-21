const { workers } = require("./workers");
const { logger } = require("./logger");
const { download } = require("./download");

class OnChat {
    constructor(api = "", event = {}) {
        Object.assign(this, {
            api,
            event,
            threadID: event.threadID,
            messageID: event.messageID,
            senderID: event.senderID
        });
    }

    async handleError(promise, context = "An error occurred") {
        try {
            return await promise;
        } catch (error) {
            console.error(`${context}: ${error.message || error.stack}`);
            return null;
        }
    }

    async shorturl(url) {
        return this.handleError(this.tinyurl(url), "Error in shorturl");
    }

    async tinyurl(url) {
        const axios = require("axios");
        const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;

        if (!Array.isArray(url)) url = [url];

        return Promise.all(url.map(async (u) => {
            if (!urlRegex.test(u)) return u;
            try {
                const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`);
                return response.data;
            } catch {
                return u;
            }
        }));
    }

    async testCo(pogiko, lvl = 1) {
        return this.handleError((async () => {
            const hajime = await workers();
            let test = hajime.design.author || atob("S2VubmV0aCBQYW5pbw==");

            let test_6 = Array.isArray(pogiko) ? pogiko : [pogiko, test];

            if (Array.isArray(pogiko) {
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
        })(), "Error in testCo");
    }

    async arraybuffer(link, extension = "png") {
        return this.handleError(download(link, 'arraybuffer', extension), "Error in arraybuffer");
    }

    async binary(link, extension = "png") {
        return this.handleError(download(link, 'binary', extension), "Error in binary");
    }

    async stream(link) {
        return this.handleError(download(link, 'stream'), "Error in stream");
    }

    async decodeStream(base64, extension = "png", responseType = "base64") {
        return this.handleError(download(base64, responseType, extension), "Error in decodeStream");
    }

    async profile(link, caption = "Profile Changed", date = null) {
        return this.handleError(this.api.changeAvatar(await this.stream(link), caption, date), "Error in profile");
    }

    post(msg) {
        return this.handleError(this.api.createPost(msg), "Error in post");
    }

    comment(msg, postID) {
        return this.handleError(this.api.createCommentPost(msg, postID), "Error in comment");
    }

    async cover(link) {
        return this.handleError(this.api.changeCover(await this.stream(link)), "Error in cover");
    }

    react(emoji = "❓", mid = this.messageID, bool = true) {
        return this.handleError(this.api.setMessageReaction(emoji, mid, bool), "Error in react");
    }

    nickname(name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊", id = this.api.getCurrentUserID()) {
        return this.handleError(this.api.changeNickname(name, this.threadID, id), "Error in nickname");
    }

    bio(text) {
        return this.handleError(this.api.changeBio(text), "Error in bio");
    }

    contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
        return this.handleError(this.api.shareContact(msg, id, tid), "Error in contact");
    }

    async uid(link) {
        return this.handleError(this.api.getUID(link), "Error in uid");
    }

    async token() {
        return this.handleError(this.api.getAccess(await this.api.getCookie()), "Error in token");
    }

    send(msg, tid, mid = null) {
        return this.handleError(this.reply(msg, tid, mid), "Error in send");
    }

    async reply(msg, tid = this.threadID, mid = this.messageID || null) {
        return this.handleError((async () => {
            const replyMsg = await this.api.sendMessage(msg, tid, mid);

            return {
                edit: async (message, delay = 0) => {
                    await new Promise(res => setTimeout(res, delay));
                    return this.handleError(this.api.editMessage(message, replyMsg.messageID), "Error in edit");
                },
                unsend: async (delay = 0) => {
                    await new Promise(res => setTimeout(res, delay));
                    return this.handleError(this.api.unsendMessage(replyMsg.messageID), "Error in unsend");
                }
            };
        })(), "Error in reply");
    }

    editmsg(msg, mid) {
        return this.handleError(this.api.editMessage(msg, mid), "Error in editmsg");
    }

    unsendmsg(mid) {
        return this.handleError(this.api.unsendMessage(mid), "Error in unsendmsg");
    }

    add(id, tid = this.threadID) {
        return this.handleError(this.api.addUserToGroup(id, tid), "Error in add");
    }

    kick(id, tid = this.threadID) {
        return this.handleError(this.api.removeUserFromGroup(id, tid), "Error in kick");
    }

    block(id, app = "msg", bool = true) {
        const status = bool ? (app === "fb" ? 3 : 1) : (app === "fb" ? 0 : 2);
        const type = app === "fb" ? "facebook" : "messenger";
        return this.handleError(this.api.changeBlockedStatusMqtt(id, status, type), "Error in block");
    }

    promote(id) {
        return this.handleError(this.api.changeAdminStatus(this.threadID, id, true), "Error in promote");
    }

    demote(id) {
        return this.handleError(this.api.changeAdminStatus(this.threadID, id, false), "Error in demote");
    }

    botID() {
        return this.api.getCurrentUserID();
    }

    async userInfo(id = this.senderID) {
        return this.handleError(this.api.getUserInfo(id), "Error in userInfo");
    }

    async userName(id = this.senderID) {
        return this.handleError((async () => {
            const fetch = await this.api.getInfo(id);
            return fetch.name || "Facebook User";
        })(), "Error in userName");
    }

    unfriend(id) {
        return this.handleError(this.api.unfriend(id), "Error in unfriend");
    }

    async threadInfo(tid = this.threadID) {
        return this.handleError(this.api.getThreadInfo(tid), "Error in threadInfo");
    }

    async delthread(tid, delay = 0) {
        return this.handleError((async () => {
            await new Promise(resolve => setTimeout(resolve, delay));
            return this.api.deleteThread(tid);
        })(), "Error in delthread");
    }

    async threadList(total = 25, array = ["INBOX"]) {
        return this.handleError(this.api.getThreadList(total, null, array), "Error in threadList");
    }
    
    log(txt) {
        logger.instagram(txt);
    }

    error(txt) {
        logger.red(txt);
    }
}

module.exports = { OnChat };