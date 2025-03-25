const {
    encryptSession,
    decryptSession,
} = require("../system/modules");

module.exports["config"] = {
    name: "aesc3c",
    type: 'Tools',
    version: "1.1.0",
    role: 1,
    info: "encode or decode appstate",
    usage: "encode [text] or decode [aes code]",
    guide: "Encode text to aes code: aesc3c encode Hello\nDecode aes code to text: aesc3c decode SGVsbG8=",
    credits: "Developer",
};

module.exports["run"] = async ({
    chat, event, args, prefix, font
}) => {
    if (args.length < 2 && event.type !== "message_reply") {
        return chat.reply(font.monospace(`Please provide an action (encode/decode) and the text, or reply to a message.\n\nExample: ${prefix}aesc3c encode Hello`));
    }

    const action = args[0]?.toLowerCase();
    let content = font.origin(args.slice(1).join(" "));

    if (event.type === "message_reply") {
        content = font.origin(event.messageReply.body);
    }

    if (!content) {
        return chat.reply(font.monospace(`Please provide text to encode/decode.\n\nExample: ${prefix}aesc3c encode Hello`));
    }

    if (action === 'encode' || action === 'enc') {
        const aescode = encryptSession(content);
        return chat.reply(aescode);
    } else if (action === 'decode' || action === 'dec') {
        try {
            const text = decryptSession(content);
            return chat.reply(text);
        } catch (error) {
            return chat.reply(font.monospace(`Invalid aes code provided for decoding.`));
        }
    } else {
        return chat.reply(font.monospace(`Invalid action. Please use "encode" or "decode".\n\nExample: ${prefix}aes encode Hello`));
    }
};