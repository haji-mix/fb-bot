module.exports["config"] = {
  name: "unfont",
  aliases: ['removefont', 'nofont', 'rmfont', 'delfont', 'clearfont'],
  type: 'Tools',
  credits: 'Kenneth Panio',
  isPrefix: false,
  version: "1.0.0",
  role: 0,
  info: "Remove font formatting from replied message or arguments",
  usage: "(reply) unfont or provide text [text]",
  guide: "reply to a message with font formatting or provide text with font formatting"
};


module.exports["run"] = async function ({ chat, event, args, font }) {
  try {
    if (event.type === "message_reply") {
      const repliedMessage = event.messageReply.body;
      return chat.reply(font.origin(repliedMessage));
    } else if (args.length > 0) {
      const text = args.join(" ");
      const unfonted = await chat.reply(font.origin(text));
      unfonted.unsend(6000);
      return;
    } else {
      return chat.reply(font.italic("Please reply to a message with font formatting or provide text with font formatting."));
    }
  } catch (error) {
    chat.reply(font.italic(`An error occurred: ${error.message}`));
  }
};
