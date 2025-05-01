const chalk = require('chalk');
const kleur = require('kleur');
const gradient = require('gradient-string');
const {
  teen,
  cristal,
  rainbow,
  pastel,
  vice,
  mind,
  morning,
  instagram,
  atlas,
  retro,
  summer,
  fruit,
  passion } = gradient;
const util = require('util');

// ===== BASE SETUP ===== //
const format = (msg) => typeof msg === 'string' ? msg : util.inspect(msg, { 
  colors: false, 
  depth: 4 
});

const supportsColor = chalk.supportsColor;
let COLOR_ENABLED = supportsColor.hasBasic;

// ===== MAIN LOGGER ===== //
const logger = (msg, style = x => x) => {
  if (!COLOR_ENABLED) style = x => x;
  console.log(style(format(msg)));
};

// ===== COLOR CONTROL ===== //
logger.enableColors = (enabled = true) => {
  COLOR_ENABLED = enabled;
  chalk.level = enabled ? (supportsColor.has16m ? 3 : 2) : 0;
  kleur.enabled = enabled;
};

// ===== CHALK INTEGRATION ===== //
const chalkStyles = {
  modifiers: ['bold', 'dim', 'italic', 'underline', 'inverse', 'strikethrough'],
  colors: ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white'],
  backgrounds: ['bgBlack', 'bgRed', 'bgGreen', 'bgYellow', 'bgBlue', 'bgMagenta', 'bgCyan']
};

logger.chalk = {};
Object.entries(chalkStyles).forEach(([type, styles]) => {
  styles.forEach(style => {
    logger.chalk[style] = (msg) => logger(msg, chalk[style]);
  });
});

// Chalk advanced
logger.chalk.hex = (hex) => ({
  print: (msg) => logger(msg, chalk.hex(hex)),
  bg: (msg) => logger(msg, chalk.bgHex(hex))
});

logger.chalk.rgb = (r, g, b) => ({
  print: (msg) => logger(msg, chalk.rgb(r, g, b)),
  bg: (msg) => logger(msg, chalk.bgRgb(r, g, b))
});

// ===== KLEUR INTEGRATION ===== //
const kleurStyles = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan'];

logger.kleur = {};
kleurStyles.forEach(color => {
  // Standard colors
  logger.kleur[color] = (msg) => logger(msg, kleur[color]);
  
  // Modifier chains
  ['bold', 'italic', 'underline'].forEach(mod => {
    logger.kleur[`${color}.${mod}`] = (msg) => logger(msg, kleur[color][mod]);
  });
});

// ===== GRADIENT INTEGRATION ===== //
const gradientPresets = {
  teen,
  cristal,
  rainbow,
  pastel,
  vice,
  mind,
  morning,
  instagram,
  atlas,
  retro,
  summer,
  fruit,
  passion
};

logger.gradient = {};
Object.entries(gradientPresets).forEach(([name, grad]) => {
  logger.gradient[name] = (msg) => 
    COLOR_ENABLED 
      ? logger(msg, typeof grad === 'function' ? grad : gradient(grad))
      : logger(msg, kleur.cyan);
});

logger.createGradient = (colors) => ({
  print: (msg) => logger(msg, gradient(colors)),
  multiline: (msg) => logger(msg, gradient(colors).multiline)
});

// ===== UTILITIES ===== //
// Error logging with stack trace
logger.error = (err) => {
  const message = err instanceof Error ? err.stack || err.message : err;
  logger(message, chalk.red.bold);
};

// Success logging
logger.success = (msg) => {
  const message = typeof msg === 'string' ? msg : util.inspect(msg, { 
    colors: false, 
    depth: 4 
  });
  logger(message, fruit);
};


// JSON formatting
logger.json = (obj) => {
  logger(JSON.stringify(obj, null, 2), chalk.cyan);
};

// Progress bar
logger.progress = (percent, width = 20) => {
  const blocks = '█'.repeat(Math.round(percent * width)).padEnd(width, '░');
  logger(`[${blocks}] ${Math.round(percent * 100)}%`, chalk.green);
};

// ===== INIT ===== //
logger.enableColors(supportsColor.hasBasic);

module.exports = { logger };
