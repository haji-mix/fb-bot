const threadCache = new Map();
let adminNotificationEnabled = true;

module.exports = {
  config: {
    name: "notification",
    aliases: ["noti"],
    version: "1.0.3",
    type: "event",
    credits: "Kenneth Panio",
    info: "Receive Group Notification Update",
    usage: "[on/off]",
  },
  handleEvent: async ({ event, chat, font, Utils }) => {
    try {
      if (!adminNotificationEnabled) return;
      
      if (!event.threadID) return;

      const mono = txt => font.monospace(txt);
      const { Currencies } = Utils;


      let groupInfo = threadCache.get(event.threadID);
      if (!groupInfo) {
        groupInfo = {
          data: await chat.threadInfo(event.threadID)
        };
        threadCache.set(event.threadID, groupInfo);
      }

      const getUserGender = async (uid) => {
        const threadInfo = groupInfo.data;
        if (!threadInfo || !threadInfo.userInfo) {
          return null;
        }
        const user = threadInfo.userInfo.find(user => user.id === uid);
        return user ? user.gender.toLowerCase() : null;
      };

      const getGenderedPronoun = async (uid) => {
        const gender = await getUserGender(uid);
        if (gender === 'male') return 'his';
        if (gender === 'female') return 'her';
        return 'their';
      };

      const getDisplayName = async (uid) => {
        let name = await Currencies.getName(uid);
        if (!name) {
          try {
            const userName = await chat.userName(uid);
            if (userName && typeof userName === 'string' && userName.trim()) {
              await Currencies.setName(uid, userName.trim());
              name = userName.trim();
            }
          } catch (error) {}
        }
        return name || `User ${uid}`;
      };

      const { author: authorID, logMessageType, logMessageData, logMessageBody } = event;

      const replies = {
        "log:thread-admins": async () => {
          const action = logMessageData.ADMIN_EVENT === "add_admin" ? "Promoted" : "Demoted";
          const targetUserId = logMessageData.TARGET_ID;
          const authorName = await getDisplayName(authorID);
          const targetName = await getDisplayName(targetUserId);
          chat.reply(mono(`[ GROUP UPDATE ]\n❯ ${authorName}, ${action} ${targetName} to ${action === "Promoted" ? "Admin" : "Member"}.`));
        },
        "log:thread-name": async () => {
          const updatedName = logMessageData.name || null;
          const authorName = await getDisplayName(authorID);
          // Update cache with new group name
          if (updatedName) {
            groupInfo.data.name = updatedName;
            threadCache.set(event.threadID, groupInfo);
          }
          const message = updatedName
            ? `${authorName} updated the group name to "${updatedName}".`
            : `${authorName} cleared the group name.`;

          const url_array = [
            "https://i.imgur.com/9UIo0dq.gif"
          ];
          const url = await chat.stream(url_array[Math.floor(Math.random() * url_array.length)]);

          if (url) {
            chat.reply({
              body: mono(`[ GROUP UPDATE ]\n❯ ${message}`),
              attachment: url
            });
          } else {
            chat.reply(mono(`[ GROUP UPDATE ]\n❯ ${message}`));
          }
        },
        "log:user-nickname": async () => {
          const { participant_id, nickname } = logMessageData;
          if (authorID === chat.botID()) return;
          if (groupInfo.data.userInfo) {
            const user = groupInfo.data.userInfo.find(user => user.id === participant_id);
            if (user) {
              user.nickname = nickname || null;
              threadCache.set(event.threadID, groupInfo);
            }
          }
          const authorName = await getDisplayName(authorID);
          const participantName = await getDisplayName(participant_id);
          if (!nickname) {
            chat.reply(mono(`[ GROUP UPDATE ]\n❯ ${authorName} removed ${participantName}'s nickname.`));
          } else {
            const message = participant_id === authorID
              ? `Set ${await getGenderedPronoun(participant_id)} own nickname to > ${nickname}`
              : `Set ${participantName}'s nickname to > ${nickname}`;
            chat.reply(mono(`[ GROUP UPDATE ]\n❯ ${authorName} ${message}`));
          }
        },
        "log:thread-icon": () => chat.reply(mono(`[ GROUP UPDATE ]\n❯ Updated group icon.`)),
        "log:thread-color": () => chat.reply(mono(`[ GROUP UPDATE ]\n❯ Updated group color.`)),
        "log:link-status": () => chat.reply(mono(logMessageBody)),
        "log:magic-words": () => {
          chat.reply(mono(`[ GROUP UPDATE ]\n❯ Theme ${logMessageData.magic_word} added effect: ${logMessageData.theme_name}\n❯ Emoji: ${logMessageData.emoji_effect || "No emoji"}\n❯ Total ${logMessageData.new_magic_word_count} word effect added`));
        },
        "log:thread-approval-mode": () => chat.reply(mono(logMessageBody)),
        "log:thread-poll": () => chat.reply(mono(logMessageBody))
      };

      if (replies[logMessageType]) await replies[logMessageType]();
    } catch (error) {
      console.error(error.stack || error.message || "Something went wrong!");
    }
  },

  run: async ({ args, chat, font }) => {
    try {
      const mono = txt => font.monospace(txt);
      const command = args[0]?.toLowerCase();

      if (!command || !["on", "off"].includes(command)) {
        chat.reply(mono("Invalid command. Use 'on' to enable notifications or 'off' to disable them."));
        return;
      }

      adminNotificationEnabled = command === "on";
      chat.reply(mono(`Thread Notifications are now ${adminNotificationEnabled ? "enabled" : "disabled"}.`));
    } catch (error) {
      console.error(error.stack || error.message || "Something went wrong!");
    }
  }
};