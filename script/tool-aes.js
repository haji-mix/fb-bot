
const CryptoJS = require('crypto-js');

const encrypt = (text, secretKey) => {
    const ciphertext = CryptoJS.AES.encrypt(text, secretKey).toString();
    return ciphertext;
};

const decrypt = (ciphertext, secretKey) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, secretKey);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
};

module.exports["config"] = {
    name: "aes",
    version: "1.2.0",
    role: 1,
    credits: "Kenneth Panio",
    info: "AES encryption/decryption",
    type: "tools",
    usage: "[enc or dec] [iteration] [text]",
    guide: "Aes enc 2 hello world\n\nEncrypted Result: 3e383e6c3e3c3e3c3e3f3a303f6e3e3f3f693e3c3e6b\n\nAes dec 2 3e383e6c3e3c3e3c3e3f3a303f6e3e3f3f693e3c3e6b \n\nDecrypted Result: hello world",
};

module.exports["run"] = async function ({ api, event, args, font, prefix }) {
    const command = args[0];
    const iterations = parseInt(args[1]);

    if (!command || isNaN(iterations) || iterations <= 0 || iterations > 10 || args.length < 2 && event.type!== "message_reply") {
        return api.sendMessage(`Please provide an action (enc/dec) (iteration numbers 1-10) and the text, or reply to a message.\n\nExample: ${prefix}aes enc 2 Hello`, event.threadID, event.messageID);
    }

    let text = font.origin(args.slice(2).join(" "));
    if (event.type === "message_reply") {
        text = font.origin(event.messageReply.body);
    }

    const secretKey = 'haji2069';

    if (command === "enc" || command === "encode") {
        let encryptedText = text;
        for (let i = 0; i < iterations; i++) {
            encryptedText = encrypt(encryptedText, secretKey);
        }
        api.sendMessage(`${encryptedText}`, event.threadID, event.messageID);
    } else if (command === "dec" || command === "decode") {
        let decryptedText = text;
        for (let i = 0; i < iterations; i++) {
            decryptedText = decrypt(decryptedText, secretKey);
        }
        api.sendMessage(`${decryptedText}`, event.threadID, event.messageID);
    } else {
        api.sendMessage(`Invalid command. Please use 'encode' or 'decode' and (iteration numbers 1-10). example: ${prefix} aes encode 2 hello`, event.threadID, event.messageID);
    }
};
