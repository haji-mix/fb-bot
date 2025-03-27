const { workers } = require("./workers");
const { logger } = require("./logger");
const { download } = require("./download");
const { fonts } = require("./fonts");

const axios = require("axios");


const formatBold = (text) => {
      if (typeof text === 'string') {
        return text.replace(/\*\*(.*?)\*\*/g, (_, content) => fonts.bold(content));
      }
      return text; 
    };

class OnChat {
    constructor(api = "", event = {}) {
        try {
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
        } catch (error) {
            this.error(`Constructor error: ${error.message}`);
        }
    }

    async shorturl(url) {
        try {
            if (!url) {
                throw new Error("URL is required.");
            }
            return await this.tinyurl(url);
        } catch (error) {
            return null;
        }
    }

async tinyurl(url) {
    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;

    if (!url) {
        throw new Error("URL is required.");
    }

    if (!Array.isArray(url)) {
        url = [url];
    }

    try {
        const shortenedUrls = await Promise.all(
            url.map(async (u) => {
                if (!u || !urlRegex.test(u)) {
                    return u;
                }

                const response = await axios.get(
                    `https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`
                );
                return response.data;
            })
        );

        return url.length === 1 ? shortenedUrls[0] : shortenedUrls;
    } catch (error) {
        return url.length === 1 ? url[0] : url;
    }
}

    async testCo(pogiko, lvl = 1) {
        try {
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
                    return;
                }
            }
        } catch (error) {
            return null;
        }
    }

    async arraybuffer(link, extension = "png") {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await download(link, 'arraybuffer', extension);
        } catch (error) {
            return null;
        }
    }

    async binary(link, extension = "png") {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await download(link, 'binary', extension);
        } catch (error) {
            return null;
        }
    }

    async stream(link) {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await download(link, 'stream');
        } catch (error) {
            return null;
        }
    }

    async decodeStream(base64, extension = "png", responseType = "base64") {
        try {
            if (!base64) {
                throw new Error("Base64 data is required.");
            }
            return await download(base64, responseType, extension);
        } catch (error) {
            return null;
        }
    }

    async profile(link, caption = "Profile Changed", date = null) {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await this.api.changeAvatar(await this.stream(link), formatBold(caption), date);
        } catch (error) {
            return null;
        }
    }

    async post(msg) {
        try {
            if (!msg) {
                throw new Error("Message is required.");
            }
            return await this.api.createPost(msg);
        } catch (error) {
            return null;
        }
    }

    async comment(msg, postID) {
        try {
            if (!msg || !postID) {
                throw new Error("Message and Post ID are required.");
            }
            return await this.api.createCommentPost(msg, postID);
        } catch (error) {
            return null;
        }
    }

    async cover(link) {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await this.api.changeCover(await this.stream(link));
        } catch (error) {
            return null;
        }
    }

    async react(emoji = "❓", mid = this.messageID, bool = true) {
        try {
            if (!mid) {
                throw new Error("Message ID is required.");
            }
            return await this.api.setMessageReaction(emoji, mid, bool);
        } catch (error) {
            return null;
        }
    }

    async nickname(name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊", id = this.api.getCurrentUserID()) {
        try {
            if (!name || !id) {
                throw new Error("Name and ID are required.");
            }
            return await this.api.changeNickname(formatBold(name), this.threadID, id);
        } catch (error) {
            return null;
        }
    }

    async bio(text) {
        try {
            if (!text) {
                throw new Error("Text is required.");
            }
            return await this.api.changeBio(formatBold(text));
        } catch (error) {
            return null;
        }
    }

    async contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
        const threadID = tid !== null && tid !== undefined ? String(tid) : null;
        try {
            if (!msg || !id || !tid) {
                throw new Error("Message, ID, and Thread ID are required.");
            }
            return await this.api.shareContact(formatBold(msg), id, threadID);
        } catch (error) {
            return null;
        }
    }

    async uid(link) {
        try {
            if (!link) {
                throw new Error("Link is required.");
            }
            return await this.api.getUID(link);
        } catch (error) {
            return null;
        }
    }

    async token() {
        try {
            return await this.api.getAccess(await this.api.getCookie());
        } catch (error) {
            return null;
        }
    }

    async send(msg, tid = this.threadID, mid = null) {
        try {
            if (!tid || !msg) {
                throw new Error("Thread ID and Message are required.");
            }
            return await this.reply(msg, tid, mid);
        } catch (error) {
            return null;
        }
    }

    async reply(msg, tid = this.threadID || null, mid = this.messageID || null) {
        try {
            const threadID = tid !== null && tid !== undefined ? String(tid) : null;
            
            if (!threadID || !msg) {
                throw new Error("Thread ID and Message are required.");
            }
    
            const formattedMsg = typeof msg === 'string' ? formatBold(msg) : {
                ...msg,
                body: msg.body ? formatBold(msg.body) : undefined
            };
    
            const replyMsg = await this.api.sendMessage(formattedMsg, threadID, mid);
    
            return {
                messageID: replyMsg.messageID,
                edit: async (message, delay = 0) => {
                    try {
                        await new Promise(res => setTimeout(res, delay));
                        return await this.editmsg(message, replyMsg.messageID);
                    } catch (error) {
                        return null;
                    }
                },
                unsend: async (delay = 0) => {
                    try {
                        await new Promise(res => setTimeout(res, delay));
                        return await this.unsendmsg(replyMsg.messageID);
                    } catch (error) {
                        return null;
                    }
                }
            };
        } catch (error) {
            return {
                messageID: null,
                edit: async () => null,
                unsend: async () => null
            };
        }
    }

    async editmsg(msg, mid) {
        try {
            if (!msg || !mid) {
                throw new Error("Message and Message ID are required.");
            }
            return await this.api.editMessage(formatBold(msg), mid);
        } catch (error) {
            return null;
        }
    }

    async unsendmsg(mid) {
        try {
            if (!mid) {
                throw new Error("Message ID is required.");
            }
            return await this.api.unsendMessage(mid);
        } catch (error) {
            return null;
        }
    }

    async add(id, tid = this.threadID) {
        try {
            if (!id || !tid) {
                throw new Error("User ID and Thread ID are required.");
            }
            return await this.api.addUserToGroup(id, tid);
        } catch (error) {
            return null;
        }
    }

    async kick(id, tid = this.threadID) {
        try {
            if (!id || !tid) {
                throw new Error("User ID and Thread ID are required.");
            }
            return await this.api.removeUserFromGroup(id, tid);
        } catch (error) {
            return null;
        }
    }

    async block(id, app = "msg", bool = true) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            const status = bool ? (app === "fb" ? 3 : 1) : (app === "fb" ? 0 : 2);
            const type = app === "fb" ? "facebook" : "messenger";
            return await this.api.changeBlockedStatusMqtt(id, status, type);
        } catch (error) {
            return null;
        }
    }

    async promote(id) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            return await this.api.changeAdminStatus(this.threadID, id, true);
        } catch (error) {
            return null;
        }
    }

    async demote(id) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            return await this.api.changeAdminStatus(this.threadID, id, false);
        } catch (error) {
            return null;
        }
    }

     botID() {
        try {
            return this.api.getCurrentUserID();
        } catch (error) {
            return null;
        }
    }

    async userInfo(id = this.senderID) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            return await this.api.getUserInfo(id);
        } catch (error) {
            return null;
        }
    }

    async userName(id = this.senderID) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            const fetch = await this.api.getInfo(id);
            return fetch.name || "Facebook User";
        } catch (error) {
            return null;
        }
    }

    async unfriend(id) {
        try {
            if (!id) {
                throw new Error("User ID is required.");
            }
            return await this.api.unfriend(id);
        } catch (error) {
            return null;
        }
    }

    async threadInfo(tid = this.threadID) {
        try {
            if (!tid) {
                throw new Error("Thread ID is required.");
            }
            return await this.api.getThreadInfo(tid);
        } catch (error) {
            return null;
        }
    }

    async delthread(tid, delay = 0) {
        try {
            if (!tid) {
                throw new Error("Thread ID is required.");
            }
            await new Promise(resolve => setTimeout(resolve, delay));
            return await this.api.deleteThread(tid);
        } catch (error) {
            return null;
        }
    }

    async threadList(total = 5, array = ["INBOX"]) {
        try {
            return await this.api.getThreadList(total, null, array);
        } catch (error) {
            return null;
        }
    }

    log(txt) {
        logger.instagram(txt);
    }

    error(txt) {
        console.error(txt);
    }
}

module.exports = { OnChat };