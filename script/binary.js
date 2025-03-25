function textToBinary(text) {
  return text.split('').map(char => {
    const binary = char.charCodeAt(0).toString(2);
    return binary.padStart(8, '0');
  }).join(' ');
}

function binaryToText(binaryCode) {
  return binaryCode.split(' ').map(binary => {
    const charCode = parseInt(binary, 2);
    return String.fromCharCode(charCode);
  }).join('');
}

module.exports["config"] = {
  name: "binary",
  aliases: ['bin'],
  type: 'Tools',
  version: "1.1.0",
  role: 1,
  info: "Encode and decode Binary code",
  usage: "encode [text] or decode [binary code]",
  guide: "Encode text to Binary code: bin encode Hello\nDecode Binary code to text: bin decode 01001000 01100101 01101100 01101100 01101111",
  credits: "Developer",
};

module.exports["run"] = async ({ chat, event, args, prefix, font }) => {
  if (args.length < 1 && event.type!== "message_reply") {
    return chat.reply(font.monospace(`Please provide an action (encode/decode) and the text, or reply to a message.\n\nExample: ${prefix}bin encode Hello`));
  }
  const action = args[0]?.toLowerCase();
  let content = font.origin(args.slice(1).join(" "));
  if (event.type === "message_reply") {
    content = font.origin(event.messageReply.body);
  }
  if (!content) {
    return chat.reply(font.monospace(`Please provide text to encode/decode.\n\nExample: ${prefix}bin encode Hello`));
  }
  if (action === 'encode' || action === 'enc') {
    const binaryCode = textToBinary(content);
    return chat.reply(binaryCode);
  } else if (action === 'decode' || action === 'dec') {
    const text = binaryToText(content);
    return chat.reply(text);
  } else {
    return chat.reply(font.monospace(`Invalid action. Please use "encode" or "decode".\n\nExample: ${prefix}bin encode Hello`));
  }
};