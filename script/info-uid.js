module.exports["config"] = {
  name: "uid",
  version: "1.3.0",
  isPrefix: false,
  role: 0,
  aliases: ['id', 'userid', 'fbid', 'fb-id'],
  info: 'search users id or retrieve your self uid',
  usage: '[name or mention or Facebook profile link]',
  credits: 'Kenneth Panio',
};

const getUserName = async (chat, senderID) => {
  try {
    const userName = await chat.userName(senderID);
    return userName || "Facebook User";
  } catch (error) {
    return "User";
  }
};


module.exports["run"] = async ({ event, args, chat, font }) => {
  const { threadID, mentions, senderID } = event;
  const targetName = args.join(' ');

  try {
    if (!targetName) {
      const selfInfo = await chat.userInfo(senderID);
      const selfName = font.italic(selfInfo[senderID].name || 'UID');
      chat.contact(`${selfName}: ${senderID}`, senderID);
      return;
    }

    if (Object.keys(mentions).length > 0) {
      for (const mentionID in mentions) {
        const mentionName = mentions[mentionID].replace('@', '');
        chat.contact(`${font.italic(mentionName)}: ${mentionID}`, mentionID);
      }
      return;
    }

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    const isFacebookLink = facebookLinkRegex.test(targetName);

    if (isFacebookLink) {
      const uid = await chat.uid(targetName);
      if (uid) {
        chat.contact(font.bold(`${await chat.userName(uid)}: `) + uid, uid);
      } else {
        chat.reply(font.italic("❗ | Unable to retrieve UID from the provided Facebook link."));
      }
      return;
    }

    const threadInfo = await chat.threadInfo(threadID);
    const participantIDs = threadInfo?.participantIDs || event?.participantIDs;

    const matchedUserIDs = await Promise.all(participantIDs.map(async (participantID) => {
      const userName = await getUserName(chat, participantID);
      return {
        userID: participantID,
        userName: userName?.toLowerCase(),
      };
    }));

    const matchedUsers = matchedUserIDs.filter(user => user.userName?.includes(targetName?.toLowerCase()));

    if (matchedUsers.length === 0) {
      chat.reply(font.italic(`❓ | There is no user with the name "${targetName}" in the group.`));
      return;
    }

    const formattedList = matchedUsers.map((user, index) => {
      const userInfo = `${font.italic(user.userName)}: ${user.userID}`;
      return `${index + 1}. ${userInfo}`;
    }).join('\n');

    chat.reply(formattedList);
  } catch (error) {
    chat.reply(font.italic(error.message || "Feature unavailable temporary blocked by meta!"));
  }
};

