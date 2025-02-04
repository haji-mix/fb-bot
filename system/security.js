const CryptoJS = require("crypto-js");

const xorC3C = process.env.xorKey || "QEtlbjIwMjQ=";

function encryptSession(sessionData, secretKey = xorC3C) {
    const sessionString = JSON.stringify(sessionData);
    const encryptedData = CryptoJS.AES.encrypt(sessionString, secretKey).toString();
    return encryptedData;
}

function decryptSession(encryptedData, secretKey = xorC3C) {
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey);
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
    const sessionData = JSON.parse(decryptedData);
    return sessionData;
}

module.exports = {
    encryptSession,
    decryptSession
};
