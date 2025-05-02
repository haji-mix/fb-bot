const { workers } = require("./workers");
const { logger } = require("./logger");
const { download } = require("./download");
const { fonts } = require("./fonts");

const axios = require("axios");

const formatBold = (text) => {
  if (typeof text === "string") {
    return text.replace(/\*\*(.*?)\*\*/g, (_, content) => fonts.bold(content));
  }
  return text;
};

class onChat {
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
        senderID: event.senderID || null,
      });
    } catch (error) {
      this.error(`Constructor error: ${error.message}`);
    }
  }

  // List of bad words (you can expand this list)
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
  ];

  #filterBadWords(text) {
    if (typeof text !== "string") return text;

    let filteredText = text;
    this.#badWords.forEach((word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      filteredText = filteredText.replace(regex, (match) => {
        if (match.length <= 2) return match;
        return `${match[0]}${"*".repeat(match.length - 2)}${
          match[match.length - 1]
        }`;
      });
    });
    return filteredText;
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

  async arraybuffer(link, extension = "png") {
    try {
      if (!link) {
        throw new Error("Link is required.");
      }
      return await download(link, "arraybuffer", extension);
    } catch (error) {
      return null;
    }
  }

  async binary(link, extension = "png") {
    try {
      if (!link) {
        throw new Error("Link is required.");
      }
      return await download(link, "binary", extension);
    } catch (error) {
      return null;
    }
  }

  async stream(link) {
    try {
      if (!link) {
        throw new Error("Link is required.");
      }
      return await download(link, "stream");
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
      return await this.api.changeAvatar(
        await this.stream(link),
        formatBold(caption),
        date
      );
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

  async reaction(emoji, mid, bool) {
    return this.react(emoji, mid, bool);
  }

  async nickname(
    name = "𝘼𝙏𝙊𝙈𝙄𝘾 𝙎𝙇𝘼𝙎𝙃 𝙎𝙏𝙐𝘿𝙄𝙊",
    id = this.api.getCurrentUserID()
  ) {
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
      const formattedMsg = formatBold(
        this.#processUrls(this.#filterBadWords(msg))
      );
      return await this.api.shareContact(formattedMsg, id, threadID);
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

      // Determine the message body based on input type
      let messageBody = typeof msg === "string" ? msg : msg.body || "";
      let messageObj = typeof msg === "string" ? { body: msg } : { ...msg };

      // Apply bad word filter, URL processing, and bold formatting to the body
      const formattedBody = formatBold(
        this.#processUrls(this.#filterBadWords(messageBody))
      );

      // Maximum character limit for Facebook Messenger
      const MAX_CHAR_LIMIT = 5000;

      // If the body exceeds the character limit, split it
      if (formattedBody.length > MAX_CHAR_LIMIT) {
        const messages = [];
        let currentMessage = "";
        let charCount = 0;

        // Split the body into words to preserve word boundaries
        const words = formattedBody.split(" ");

        for (const word of words) {
          const wordLength = word.length + 1; // +1 for the space
          if (charCount + wordLength > MAX_CHAR_LIMIT) {
            messages.push(currentMessage.trim());
            currentMessage = word + " ";
            charCount = wordLength;
          } else {
            currentMessage += word + " ";
            charCount += wordLength;
          }
        }

        // Push the last chunk if it exists
        if (currentMessage.trim()) {
          messages.push(currentMessage.trim());
        }

        // Send each chunk as a separate message sequentially
        const sentMessages = [];
        for (let index = 0; index < messages.length; index++) {
          const chunk = messages[index];
          const chunkMsg = {
            body: index === 0 ? chunk : `... ${chunk}`, // Add continuation indicator
            ...messageObj, // Preserve other properties (e.g., sticker, mentions)
            // Only include attachment in the last chunk
            attachment:
              index === messages.length - 1 ? messageObj.attachment : undefined,
          };
          // Add a 100ms delay before sending each chunk
          await new Promise((resolve) => setTimeout(resolve, 100));
          const replyMsg = await this.api.sendMessage(
            chunkMsg,
            threadID,
            index === 0 ? mid : null
          );
          sentMessages.push(replyMsg);
        }

        // Return the last message's details with edit/unsend/delete methods
        const lastReplyMsg = sentMessages[sentMessages.length - 1];
        return {
          messageID: lastReplyMsg.messageID,
          edit: async (message, delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.editmsg(message, lastReplyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
          unsend: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(lastReplyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
          delete: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(lastReplyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
        };
      } else {
        // If the body is within the limit, send the message as is
        const formattedMsg =
          typeof msg === "string"
            ? formattedBody
            : { ...messageObj, body: formattedBody };
        const replyMsg = await this.api.sendMessage(
          formattedMsg,
          threadID,
          mid
        );

        return {
          messageID: replyMsg.messageID,
          edit: async (message, delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.editmsg(message, replyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
          unsend: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(replyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
          delete: async (delay = 0) => {
            try {
              await new Promise((res) => setTimeout(res, delay));
              return await this.unsendmsg(replyMsg.messageID);
            } catch (error) {
              return null;
            }
          },
        };
      }
    } catch (error) {
      return {
        messageID: null,
        edit: async () => null,
        unsend: async () => null,
        delete: async () => null,
      };
    }
  }

  async editmsg(msg, mid) {
    try {
      if (!msg || !mid) {
        throw new Error("Message and Message ID are required.");
      }

      const formattedMsg = formatBold(
        this.#processUrls(this.#filterBadWords(msg))
      );
      return await this.api.editMessage(formattedMsg, mid);
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
      const status = bool ? (app === "fb" ? 3 : 1) : app === "fb" ? 0 : 2;
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
      await new Promise((resolve) => setTimeout(resolve, delay));
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
    logger.success(txt);
  }

  error(txt) {
    logger.error(txt);
  }
}

module.exports = { onChat };
