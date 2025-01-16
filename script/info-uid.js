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

module.exports["run"] = async ({ event, args, chat, font }) => {
  const { threadID, mentions, senderID } = event;
  const targetName = args.join(' ');

  try {
    if (!targetName) {
      chat.contact(`${senderID}`, senderID);
      return;
    }

    if (Object.keys(mentions).length > 0) {
      for (const mentionID in mentions) {
        chat.contact(`${mentionID}`, mentionID);
      }
      return;
    }

    const facebookLinkRegex = /(?:https?:\/\/)?(?:www\.)?facebook\.com\/(?:profile\.php\?id=)?(\d+)|@(\d+)|facebook\.com\/([a-zA-Z0-9.]+)/i;
    const isFacebookLink = facebookLinkRegex.test(targetName);

    if (isFacebookLink) {
      const uid = await chat.uid(targetName);
      if (uid) {
        chat.contact(uid, uid);
      } else {
        chat.reply(font.italic("❗ | Unable to retrieve UID from the provided Facebook link."));
      }
      return;
    }

    const threadInfo = await chat.threadInfo(threadID);
    const participantIDs = threadInfo?.participantIDs || event?.participantIDs;

    const matchedUserIDs = participantIDs.filter(participantID => participantID.includes(targetName));

    if (matchedUserIDs.length === 0) {
      chat.reply(font.italic(`❓ | There is no user with the name "${targetName}" in the group.`));
      return;
    }

    const formattedList = matchedUserIDs.map((userID, index) => {
      return `${index + 1}. ${userID}`;
    }).join('\n');

    chat.reply(formattedList);
  } catch (error) {
    chat.reply(font.italic(error.message || "Feature unavailable temporarily blocked by meta!"));
  }
};
