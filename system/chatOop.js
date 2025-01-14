const { workers } = require("./workers");

const {
    download
} = require("./stream");

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
                this.log("Array must contain exactly two authors for comparison.");
                return;
            }
            authors = pogiko;
        } else {
            authors = [pogiko,
                owner];
        }

        const [author1,
            author2] = authors;

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
        if (!link) return this.log("Missing Arraybuffer Url!");
        return await download(link, 'arraybuffer', extension);
    }

    async stream(link) {
        if (!link) return this.log("Missing Stream Url!");
        return await download(link, 'stream');
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

    async reply(msg, tid = this.threadID, mid = null) {
        if (!msg) {
            this.log("Message is missing!");
            return;
        }
        const replyMsg = await this.api.sendMessage(msg, tid, mid).catch(() => {});
        if (replyMsg) {
            return {
                edit: async (message, delay = 0) => {
                    if (!message) {
                        this.log("Missing Edit Message!");
                        return;
                    }
                    await new Promise(res => setTimeout(res, delay));
                    await this.api.editMessage(message, replyMsg.messageID);
                },
                unsend: async (delay = 0) => {
                    if (!replyMsg.messageID) {
                        this.log("Missing Message ID!");
                        return;
                    }
                    await new Promise(res => setTimeout(res, delay));
                    await this.api.unsendMessage(replyMsg.messageID);
                }
            };
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
        const userInfo = await this.api.getUserInfo(id);
        return (userInfo[id]?.name) || "Unknown User";
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
        logger.passion(txt);
    }
}

module.exports = {
    OnChat
};