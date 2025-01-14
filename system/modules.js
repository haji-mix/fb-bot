const {
    workers
} = require("./workers");
const {
    logger
} = require("./logger");
const {
    fonts
} = require("./fonts");
const {
    OnChat
} = require("./chatOop");
const {
    loadModules
} = require("./cmdload");
const {
    encryptSession,
    decryptSession
} = require("./security");
const {
    generateUserAgent
} = require("./useragent");

module.exports = {
    workers,
    logger,
    fonts,
    OnChat,
    loadModules,
    encryptSession,
    decryptSession,
    generateUserAgent
}