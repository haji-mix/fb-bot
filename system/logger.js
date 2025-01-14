const gradient = require('gradient-string');

const logger = (msg, color = gradient('white')) => {
    console.log(color(msg));
};

logger.cristal = (msg) => logger(msg, gradient.cristal);
logger.teen = (msg) => logger(msg, gradient.teen);
logger.mind = (msg) => logger(msg, gradient.mind);
logger.morning = (msg) => logger(msg, gradient.morning);
logger.vice = (msg) => logger(msg, gradient.vice);
logger.passion = (msg) => logger(msg, gradient.passion);
logger.fruit = (msg) => logger(msg, gradient.fruit);
logger.instagram = (msg) => logger(msg, gradient.instagram);
logger.atlas = (msg) => logger(msg, gradient.atlas);
logger.retro = (msg) => logger(msg, gradient.retro);
logger.summer = (msg) => logger(msg, gradient.summer);
logger.pastel = (msg) => logger(msg, gradient.pastel);
logger.rainbow = (msg) => logger(msg, gradient.rainbow);

module.exports = {
    logger
};