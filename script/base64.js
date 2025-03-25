
module.exports["config"] = {
    name: "base64",
    aliases: ['b64'],
    type: 'Tools',
    version: "1.1.0",
    role: 1,
    info: "Encode and decode Base64 code",
    usage: "encode [text] or decode [base64 code]",
    guide: "Encode text to Base64 code: b64 encode Hello\nDecode Base64 code to text: b64 decode SGVsbG8=",
    credits: "Developer",
};

module.exports["run"] = async ({ chat, event, args, prefix, font }) => {
    if (args.length < 2 && event.type !== "message_reply") {
        return chat.reply(font.monospace(`Please provide an action (encode/decode) and the text, or reply to a message.\n\nExample: ${prefix}b64 encode Hello`));
    }

    const action = args[0]?.toLowerCase();
    let content = font.origin(args.slice(1).join(" "));

    if (event.type === "message_reply") {
        content = font.origin(event.messageReply.body);
    }

    if (!content) {
        return chat.reply(font.monospace(`Please provide text to encode/decode.\n\nExample: ${prefix}b64 encode Hello`));
    }

    if (action === 'encode' || action === 'enc') {
        const base64Code = Buffer.from(content).toString('base64');
        return chat.reply(base64Code);
    } else if (action === 'decode' || action === 'dec') {
        try {
            const text = Buffer.from(content, 'base64').toString('utf-8');
            return chat.reply(text);
        } catch (error) {
            return chat.reply(font.monospace(`Invalid Base64 code provided for decoding.`));
        }
    } else {
        return chat.reply(font.monospace(`Invalid action. Please use "encode" or "decode".\n\nExample: ${prefix}b64 encode Hello`));
    }
};
