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
const {
    getCommands,
    getInfo,
    processExit
} = require("./routehandler");
const {
    download
} = require("./download");

const { botHandler } = require("./bothandler");

const { minifyHtml, obfuscate } = require("./htmlLib");

module.exports = {
    workers,
    logger,
    download,
    fonts,
    OnChat,
    loadModules,
    encryptSession,
    decryptSession,
    generateUserAgent,
    getCommands,
    getInfo,
    processExit,
    botHandler,
    minifyHtml,
    obfuscate
}