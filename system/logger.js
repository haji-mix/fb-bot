const gradient = require('gradient-string');
const chalk = require('chalk');
const logger = (msg, colorFunc = chalk.reset) => {
    console.log(colorFunc(msg));
};

const chalkStyles = {
    textStyles: [
        'reset', 'bold', 'dim', 'italic', 'underline', 'overline', 'inverse',
        'hidden', 'strikethrough', 'visible'
    ],
    colors: [
        'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
        'gray', 'grey', 'redBright', 'greenBright', 'yellowBright', 'blueBright',
        'magentaBright', 'cyanBright', 'whiteBright'
    ],
    bgColors: [
        'bgBlack', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta',
        'bgCyan', 'bgWhite', 'bgGray', 'bgGrey', 'bgBlackBright', 'bgRedBright',
        'bgGreenBright', 'bgYellowBright', 'bgBlueBright', 'bgMagentaBright',
        'bgCyanBright', 'bgWhiteBright'
    ]
};

Object.entries(chalkStyles).forEach(([styleType, styles]) => {
    styles.forEach(style => {
        logger[style] = (msg) => logger(msg, chalk[style]);
    });
});

const gradients = [
    'cristal', 'teen', 'mind', 'morning', 'vice', 'passion', 'fruit',
    'instagram', 'atlas', 'retro', 'summer', 'pastel', 'rainbow'
];

gradients.forEach(gradientStyle => {
    logger[gradientStyle] = (msg) => logger(msg, gradient[gradientStyle]);
});

module.exports = {
    logger
};
