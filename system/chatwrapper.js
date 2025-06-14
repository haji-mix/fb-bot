const { logger } = require("./logger");
const { download } = require("./download");
const { fonts } = require("./fonts");
const axios = require("axios");

const formatBold = (text) => {
  if (typeof text !== "string") return text;
  return text.replace(/\*\*(.*?)\*\*/g, (_, content) => fonts.bold(content));
};

class onChat {
  #badWords = [
    "damn",
    "hell",
    "shit",
    "fuck",
    "bitch",
    "asshole",
    "nigga",
    "dick",
    "cock",
    "penis",
    "suck",
    "blowjob",
    "porn",
    "nude",
    "naked",
    "hack",
    "kill",
    "murder",
    "nigger",
    "idiot",
    "dumb",
    "loli",
    "gay"
  ];

  constructor(api = "", event = {}) {
    try {
      if (!api || !event) throw new Error("API and event objects are required.");
      Object.assign(this, {
        api,
        event,
        threadID: event.threadID || null,
        messageID: event.messageID || null,
        senderID: event.senderID || null,
      });
    } catch (error) {
      this.error(`Constructor error: ${error.message}`);
    }
  }

  #normalizeWord(word) {
    return word.toLowerCase()
      .replace(/([a-z])\1{2,}/gi, '$1$1')
      .replace(/[^a-z]/g, ''); 
  }

  #isSimilarToBadWord(word) {
    const normalizedWord = this.#normalizeWord(word);
    
    for (const badWord of this.#badWords) {
      if (normalizedWord === badWord) return true;
      
      if (normalizedWord.startsWith(badWord) && 
          normalizedWord.length <= badWord.length + 3) {
        return true;
      }

      const suffixPattern = new RegExp(`^${badWord}(s|es|ed|ing|er|r)?$`, 'i');
      if (suffixPattern.test(normalizedWord)) return true;

      const leetPattern = badWord
        .replace(/a/gi, '[a4@]')
        .replace(/e/gi, '[e3]')
        .replace(/i/gi, '[i1!]')
        .replace(/o/gi, '[o0]')
        .replace(/s/gi, '[s5$]')
        .replace(/t/gi, '[t7]');
      const leetRegex = new RegExp(`^${leetPattern}`, 'i');
      if (leetRegex.test(normalizedWord)) return true;
    }
    return false;
  }

  #filterBadWords(text) {
    if (typeof text !== "string") return text;
    
    return text.replace(/\b[\w']+\b/g, (word) => {
      if (word.length <= 2) return word;
      if (this.#isSimilarToBadWord(word)) {
        return word[0] + "*".repeat(word.length - 2) + (word.length > 1 ? word[word.length - 1] : '');
      }
      return word;
    });
  }

  #processUrls(text) {
    if (typeof text !== "string") return text;
    const urlRegex = /(https?:\/\/[^\s/$.?#].[^\s]*)/gi;
    return text.replace(urlRegex, (url) => {
      const domainMatch = url.match(/https?:\/\/([^\/]+)/i);
      if (domainMatch && domainMatch[1]) {
        const domain = domainMatch[1];
        const modifiedDomain = domain.replace(/\./g, "(.)");
        return url.replace(domain, modifiedDomain);
      }
      return url;
    });
  }

  async shorturl(url) {
    try {
      if (!url) throw new Error("URL is required.");
      return await this.tinyurl(url);
    } catch (error) {
      this.error(`Shorturl error: ${error.message}`);
      return null;
    }
  }

  async tinyurl(url) {
    const urlRegex = /^(https?:\/\/[^\s/$.?#].[^\s]*)$/i;
    if (!url) throw new Error("URL is required.");
    if (!Array.isArray(url)) url = [url];
    try {
      const shortenedUrls = await Promise.all(
        url.map(async (u) => {
          if (!u || !urlRegex.test(u)) return u;
          const response = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`);
          return response.data;
        }),
      );
      return url.length === 1 ? shortenedUrls[0] : shortenedUrls;
    } catch (error) {
      this.error(`Tinyurl error: ${error.message}`);
      return url.length === 1 ? url[0] : url;
    }
  }

  async arraybuffer(link, extension = "png") {
    try {
      if (!link) throw new Error("Link is required.");
      return await download(link, "arraybuffer", extension);
    } catch (error) {
      this.error(`Arraybuffer error: ${error.message}`);
      return null;
    }
  }

  async binary(link, extension = "png") {
    try {
      if (!link) throw new Error("Link is required.");
      return await download(link, "binary", extension);
    } catch (error) {
      this.error(`Binary error: ${error.message}`);
      return null;
    }
  }

  async stream(link) {
    try {
      if (!link) throw new Error("Link is required.");
      return await download(link, "stream");
    } catch (error) {
      this.error(`Stream error: ${error.message}`);
      return null;
    }
  }

  async decodeStream(base64, extension = "png", responseType = "base64") {
    try {
      if (!base64) throw new Error("Base64 data is required.");
      return await download(base64, responseType, extension);
    } catch (error) {
      this.error(`DecodeStream error: ${error.message}`);
      return null;
    }
  }

  async profile(link, caption = "Profile Changed", date = null) {
    try {
      if (!link) throw new Error("Link is required.");
      return await this.api.changeAvatar(await this.stream(link), formatBold(caption), date);
    } catch (error) {
      this.error(`Profile error: ${error.message}`);
      return null;
    }
  }

  async post(msg) {
    try {
      if (!msg) throw new Error("Message is required.");
      return await this.api.createPost(msg);
    } catch (error) {
      this.error(`Post error: ${error.message}`);
      return null;
    }
  }

  async comment(msg, postID) {
    try {
      if (!msg || !postID) throw new Error("Message and Post ID are required.");
      return await this.api.createCommentPost(msg, postID);
    } catch (error) {
      this.error(`Comment error: ${error.message}`);
      return null;
    }
  }

  async cover(link) {
    try {
      if (!link) throw new Error("Link is required.");
      return await this.api.changeCover(await this.stream(link));
    } catch (error) {
      this.error(`Cover error: ${error.message}`);
      return null;
    }
  }

  async react(emoji = "❓", mid = this.messageID, bool = true) {
    try {
      if (!mid) throw new Error("Message ID is required.");
      return await this.api.setMessageReaction(emoji, mid, bool);
    } catch (error) {
      this.error(`React error: ${error.message}`);
      return null;
    }
  }

  async onReact(callback, mid = this.messageID) {
    try {
      if (typeof callback !== "function") throw new Error("Callback must be a function.");
      if (!mid) throw new Error("Message ID is required for reaction listener.");

      global.Hajime.reactions = global.Hajime.reactions || {};
      global.Hajime.reactions[mid] = {
        author: this.senderID || this.api.getCurrentUserID(),
        callback: async (params) => {
          try {
            const { event } = params;
            const reactionContext = new onChat(this.api, event);
            await callback({
              ...reactionContext,
              reaction: event.reaction || null,
              reply: async (msg, tid = event.threadID, mid = event.messageID) =>
                await reactionContext.reply(fonts.thin(msg), tid, mid),
            });
          } catch (error) {
            this.error(`onReact callback error: ${error.message}`);
          }
        },
      };

      setTimeout(() => delete global.Hajime.reactions[mid], 300000);
      return () => {
        try {
          delete global.Hajime.reactions[mid];
        } catch (error) {
          this.error(`Error removing onReact listener: ${error.message}`);
        }
      };
    } catch (error) {
      this.error(`onReact setup error: ${error.message}`);
      return () => {};
    }
  }

  async nickname(name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊", id = this.api.getCurrentUserID()) {
    try {
      if (!name || !id) throw new Error("Name and ID are required.");
      return await this.api.changeNickname(formatBold(name), this.threadID, id);
    } catch (error) {
      this.error(`Nickname error: ${error.message}`);
      return null;
    }
  }

  async bio(text) {
    try {
      if (!text) throw new Error("Text is required.");
      return await this.api.changeBio(formatBold(text));
    } catch (error) {
      this.error(`Bio error: ${error.message}`);
      return null;
    }
  }

  async contact(msg, id = this.api.getCurrentUserID(), tid = this.threadID) {
    try {
      if (!msg || !id || !tid) throw new Error("Message, ID, and Thread ID are required.");
      const formattedMsg = formatBold(this.#processUrls(this.#filterBadWords(msg)));
      return await this.api.shareContact(formattedMsg, id, String(tid));
    } catch (error) {
      this.error(`Contact error: ${error.message}`);
      return null;
    }
  }

  async uid(link) {
    try {
      if (!link) throw new Error("Link is required.");
      return await this.api.getUID(link);
    } catch (error) {
      this.error(`UID error: ${error.message}`);
      return null;
    }
  }

  async token() {
    try {
      return await this.api.getAccess(await this.api.getCookie());
    } catch (error) {
      this.error(`Token error: ${error.message}`);
      return null;
    }
  }

  async send(msg, tid = this.threadID, mid = null) {
    try {
      if (!tid || !msg) throw new Error("Thread ID and Message are required.");
      return await this.reply(msg, tid, mid);
    } catch (error) {
      this.error(`Send error: ${error.message}`);
      return null;
    }
  }

  async #processAttachment(attachment) {
    try {
      if (!attachment) return null;

      if (typeof attachment === 'string') {
        attachment = [attachment];
      }

      if (!Array.isArray(attachment)) return attachment;

      const processedAttachments = await Promise.all(
        attachment.map(async (item) => {
          if (typeof item === 'string' && (item.startsWith('http://') || item.startsWith('https://'))) {
            return await this.stream(item);
          }

          if (
            item &&
            typeof item === 'object' &&
            typeof item.url === 'string' &&
            (item.url.startsWith('http://') || item.url.startsWith('https://'))
          ) {
            return await this.stream(item.url);
          }

          if (item && typeof item === 'object' && item.stream) {
            return item.stream;
          }
          return item;
        })
      );

      return processedAttachments;
    } catch (error) {
      this.error(`Attachment processing error: ${error.message}`);
      return attachment;
    }
  }

  async reply(msg, tid = this.threadID, mid = this.messageID) {
    try {
      const threadID = tid !== null && tid !== undefined ? String(tid) : null;
      if (!threadID || !msg) throw new Error("Thread ID and Message are required.");

      let messageBody = typeof msg === "string" ? msg : msg.body || "";
      let attachments = typeof msg === "object" && msg.attachment ? await this.#processAttachment(msg.attachment) : null;
      const formattedMsg =
        typeof msg === "string"
          ? formatBold(this.#processUrls(this.#filterBadWords(messageBody)))
          : {
              ...msg,
              body: messageBody ? formatBold(this.#processUrls(this.#filterBadWords(messageBody))) : undefined,
              attachment: attachments
            };

      const MAX_CHAR_LIMIT = 5000;
      if (
        (typeof formattedMsg === "string" && formattedMsg.length > MAX_CHAR_LIMIT) ||
        (typeof formattedMsg === "object" && formattedMsg.body && formattedMsg.body.length > MAX_CHAR_LIMIT)
      ) {
        const messages = [];
        let currentMessage = "";
        let charCount = 0;
        const textToSplit = typeof formattedMsg === "string" ? formattedMsg : formattedMsg.body;
        const words = textToSplit.split(" ");

        for (const word of words) {
          const wordLength = word.length + 1;
          if (charCount + wordLength > MAX_CHAR_LIMIT) {
            messages.push(currentMessage.trim());
            currentMessage = word + " ";
            charCount = wordLength;
          } else {
            currentMessage += word + " ";
            charCount += wordLength;
          }
        }
        if (currentMessage.trim()) messages.push(currentMessage.trim());

        const sentMessages = [];
        for (let index = 0; index < messages.length; index++) {
          const chunk = messages[index];
          const chunkMsg = index === 0 ? chunk : `... ${chunk}`;
          const isLastChunk = index === messages.length - 1;
          const messageObject = {
            body: chunkMsg,
            ...(isLastChunk && attachments ? { attachment: attachments } : {}),
          };
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const replyMsg = await this.api.sendMessage(messageObject, threadID, index === 0 ? mid : null);
          sentMessages.push(replyMsg);
        }

        const lastReplyMsg = sentMessages[sentMessages.length - 1];
        return {
          messageID: lastReplyMsg.messageID,
          edit: async (message, delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.editmsg(message, lastReplyMsg.messageID);
            } catch (error) {
              this.error(`Edit message error: ${error.message}`);
              return null;
            }
          },
          unsend: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(lastReplyMsg.messageID);
            } catch (error) {
              this.error(`Unsend message error: ${error.message}`);
              return null;
            }
          },
          delete: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(lastReplyMsg.messageID);
            } catch (error) {
              this.error(`Delete message error: ${error.message}`);
              return null;
            }
          },
          onReply: async (callback) => {
            try {
              if (typeof callback !== "function") throw new Error("Callback must be a function.");
              if (!lastReplyMsg.messageID) throw new Error("No message ID available for reply listener.");

              global.Hajime.replies[lastReplyMsg.messageID] = {
                author: this.senderID || this.api.getCurrentUserID(),
                callback: async (params) => {
                  try {
                    const { event } = params;
                    const formattedBody = this.#filterBadWords(this.#processUrls(event.body || "")));
                    const replyContext = new onChat(this.api, event);
                    await callback({
                      ...replyContext,
                      body: formattedBody,
                      args: event.body ? event.body.trim().split(/\s+/) : [],
                      fonts,
                      reply: async (msg, tid = event.threadID, mid = event.messageID) =>
                        await replyContext.reply(fonts.thin(msg), tid, mid),
                    });
                  } catch (error) {
                    this.error(`onReply callback error: ${error.message}`);
                  }
                },
                conversationHistory: [],
              };

              setTimeout(() => delete global.Hajime.replies[lastReplyMsg.messageID], 300000);
              return () => {
                try {
                  delete global.Hajime.replies[lastReplyMsg.messageID];
                } catch (error) {
                  this.error(`Error removing onReply listener: ${error.message}`);
                }
              };
            } catch (error) {
              this.error(`onReply setup error: ${error.message}`);
              return () => {};
            }
          },
          onReact: async (callback) => {
            try {
              if (typeof callback !== "function") throw new Error("Callback must be a function.");
              if (!lastReplyMsg.messageID) throw new Error("No message ID available for reaction listener.");

              global.Hajime.reactions = global.Hajime.reactions || {};
              global.Hajime.reactions[lastReplyMsg.messageID] = {
                author: this.senderID || this.api.getCurrentUserID(),
                callback: async (params) => {
                  try {
                    const { event } = params;
                    const reactionContext = new onChat(this.api, event);
                    await callback({
                      ...reactionContext,
                      reaction: event.reaction || null,
                      reply: async (msg, tid = event.threadID, mid = event.messageID) =>
                        await reactionContext.reply(fonts.thin(msg), tid, mid),
                    });
                  } catch (error) {
                    this.error(`onReact callback error: ${error.message}`);
                  }
                },
              };

              setTimeout(() => delete global.Hajime.reactions[lastReplyMsg.messageID], 300000);
              return () => {
                try {
                  delete global.Hajime.reactions[lastReplyMsg.messageID];
                } catch (error) {
                  this.error(`Error removing onReact listener: ${error.message}`);
                }
              };
            } catch (error) {
              this.error(`onReact setup error: ${error.message}`);
              return () => {};
            }
          },
        };
      } else {
        const replyMsg = await this.api.sendMessage(formattedMsg, threadID, mid);
        return {
          messageID: replyMsg.messageID,
          edit: async (message, delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.editmsg(message, replyMsg);
            } catch (error) {
              this.error(`Edit message error: ${error.message}`);
              return null;
            }
          },
          unsend: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(replyMsg);
            } catch (error) {
              this.error(`Unsend message error: ${error.message}`);
              return null;
            }
          },
          delete: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(replyMsg);
            } catch (error) {
              this.error(`Delete message error: ${error.message}`);
              return null;
            }
          },
          onReply: async (callback) => {
            try {
              if (typeof callback !== "function") throw new Error("Callback must be a function.");
              if (!replyMsg.messageID) throw new Error("No message ID available for reply listener.");

              global.Hajime.replies[replyMsg.messageID] = {
                author: this.senderID || this.api.getCurrentUserID(),
                callback: async (params) => {
                  try {
                    const { event } = params;
                    const formattedBody = this.#filterBadWords(this.#processUrls(event.body || "")));
                    const replyContext = new onChat(this.api, event);
                    await callback({
                      ...replyContext,
                      body: formattedBody,
                      args: event.body ? event.body.trim().split(/\s+/) : [],
                      fonts,
                      reply: async (msg, tid = event.threadID, mid = event.messageID) =>
                        await replyContext.reply(fonts.thin(msg), tid, mid),
                    });
                  } catch (error) {
                    this.error(`onReply callback error: ${error.message}`);
                  }
                },
                conversationHistory: [],
              };

              setTimeout(() => delete global.Hajime.replies[replyMsg.messageID], 300000);
              return () => {
                try {
                  delete global.Hajime.replies[replyMsg.messageID];
                } catch (error) {
                  this.error(`Error removing onReply listener: ${error.message}`);
                }
              };
            } catch (error) {
              this.error(`onReply setup error: ${error.message}`);
              return () => {};
            }
          },
          onReact: async (callback) => {
            try {
              if (typeof callback !== "function") throw new Error("Callback must be a function.");
              if (!replyMsg.messageID) throw new Error("No message ID available for reaction listener.");

              global.Hajime.reactions = global.Hajime.reactions || {};
              global.Hajime.reactions[replyMsg.messageID] = {
                author: this.senderID || this.api.getCurrentUserID(),
                callback: async (params) => {
                  try {
                    const { event } = params;
                    const reactionContext = new onChat(this.api, event);
                    await callback({
                      ...reactionContext,
                      reaction: event.reaction || null,
                      reply: async (msg, tid = event.threadID, mid = event.messageID) =>
                        await reactionContext.reply(fonts.thin(msg), tid, mid),
                    });
                  } catch (error) {
                    this.error(`onReact callback error: ${error.message}`);
                  }
                },
              };

              setTimeout(() => delete global.Hajime.reactions[replyMsg.messageID], 300000);
              return () => {
                try {
                  delete global.Hajime.reactions[replyMsg.messageID];
                } catch (error) {
                  this.error(`Error removing onReact listener: ${error.message}`);
                }
              };
            } catch (error) {
              this.error(`onReact setup error: ${error.message}`);
              return () => {};
            }
          },
        };
      }
    } catch (error) {
      this.error(`Reply error: ${error.message}`);
      return {
        messageID: null,
        edit: async () => null,
        unsend: async () => null,
        delete: async () => null,
        onReply: async () => () => {},
        onReact: async () => () => {},
      };
    }
  }

  async editmsg(msg, mid, delay = 0) {
    try {
      await new Promise((res) => setTimeout(res, delay));
      if (!msg || !mid) throw new Error("Message and Message ID are required.");
      const formattedMsg = formatBold(this.#processUrls(this.#filterBadWords(msg)));
      return await this.api.editMessage(formattedMsg, mid.messageID);
    } catch (error) {
      this.error(`Edit message error: ${error.message}`);
      return null;
    }
  }

  async unsendmsg(mid, delay = 0) {
    try {
      await new Promise((res) => setTimeout(res, delay));
      if (!mid) throw new Error("Message ID is required.");
      return await this.api.unsendMessage(mid.messageID);
    } catch (error) {
      this.error(`Unsend message error: ${error.message}`);
      return null;
    }
  }
  
  async delete(mid, delay) {
    try {
      if (!mid) throw new Error("Message ID is required.");
      return await this.unsendmsg(mid, delay);       
    } catch (error) {
      this.error(`Delete message error: ${error.message}`);
      return null;
    }
  }

  async add(id, tid = this.threadID) {
    try {
      if (!id || !tid) throw new Error("User ID and Thread ID are required.");
      return await this.api.addUserToGroup(id, tid);
    } catch (error) {
      this.error(`Add user error: ${error.message}`);
      return null;
    }
  }

  async kick(id, tid = this.threadID) {
    try {
      if (!id || !tid) throw new Error("User ID and Thread ID are required.");
      return await this.api.removeUserFromGroup(id, tid);
    } catch (error) {
      this.error(`Kick user error: ${error.message}`);
      return null;
    }
  }

  async block(id, app = "msg", bool = true) {
    try {
      if (!id) throw new Error("User ID is required.");
      const status = bool ? (app === "fb" ? 3 : 1) : (app === "fb" ? 0 : 2);
      const type = app === "fb" ? "facebook" : "messenger";
      return await this.api.changeBlockedStatusMqtt(id, status, type);
    } catch (error) {
      this.error(`Block user error: ${error.message}`);
      return null;
    }
  }

  async promote(id) {
    try {
      if (!id) throw new Error("User ID is required.");
      return await this.api.changeAdminStatus(this.threadID, id, true);
    } catch (error) {
      this.error(`Promote user error: ${error.message}`);
      return null;
    }
  }

  async demote(id) {
    try {
      if (!id) throw new Error("User ID is required.");
      return await this.api.changeAdminStatus(this.threadID, id, false);
    } catch (error) {
      this.error(`Demote user error: ${error.message}`);
      return null;
    }
  }

  botID() {
    try {
      return this.api.getCurrentUserID();
    } catch (error) {
      this.error(`Bot ID error: ${error.message}`);
      return null;
    }
  }

  async userInfo(id = this.senderID) {
    try {
      if (!id) throw new Error("User ID is required.");
      return await this.api.getUserInfo(id);
    } catch (error) {
      this.error(`User info error: ${error.message}`);
      return null;
    }
  }

  async userName(id = this.senderID) {
    try {
      if (!id) throw new Error("User ID is required.");
      const fetch = await this.api.getInfo(id);
      return fetch.name;
    } catch (error) {
      this.error(`User name error: ${error.message}`);
      return null;
    }
  }

  async unfriend(id) {
    try {
      if (!id) throw new Error("User ID is required.");
      return await this.api.unfriend(id);
    } catch (error) {
      this.error(`Unfriend error: ${error.message}`);
      return null;
    }
  }

  async threadInfo(tid = this.threadID) {
    try {
      if (!tid) throw new Error("Thread ID is required.");
      return await this.api.getThreadInfo(tid);
    } catch (error) {
      this.error(`Thread info error: ${error.message}`);
      return null;
    }
  }

  async delthread(tid, delay = 0) {
    try {
      if (!tid) throw new Error("Thread ID is required.");
      await new Promise((resolve) => setTimeout(resolve, delay));
      return await this.api.deleteThread(tid);
    } catch (error) {
      this.error(`Delete thread error: ${error.message}`);
      return null;
    }
  }

  async threadList(total = 5, array = ["INBOX"]) {
    try {
      return await this.api.getThreadList(total, null, array);
    } catch (error) {
      this.error(`Thread list error: ${error.message}`);
      return null;
    }
  }

  log(txt) {
    logger.success(txt);
  }

  error(txt) {
    logger.error(txt);
  }
}

module.exports = { onChat };