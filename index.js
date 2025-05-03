require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");

const { logger } = require("./system/modules");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const restartEnabled = process.env.PID !== "0";
const RESTART_DELAY = 5000; // 5 seconds

process.removeAllListeners('warning');
process.on('warning', (warning) => {
  if (!warning.message.includes('DeprecationWarning')) {
    logger.warn.bold(warning.name, warning.message);
  }
});

let mainProcess = null;
let restartTimeout = null;
let isSpawning = false;

function cleanup() {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }

  if (mainProcess) {
    mainProcess.removeAllListeners();
    if (!mainProcess.killed && mainProcess.pid) {
      try {
        process.kill(mainProcess.pid, 'SIGKILL'); // Use SIGKILL for reliable termination
        logger.info(`Terminated process ${mainProcess.pid}`);
      } catch (e) {
        logger.error(`Error killing process ${mainProcess.pid}: ${e.message}`);
      }
    }
    mainProcess = null;
  }
}

function scheduleRestart(delay = RESTART_DELAY) {
  if (isSpawning) {
    logger.warn("Restart already in progress, skipping...");
    return;
  }

  isSpawning = true;
  logger.success(`Scheduling restart in ${delay}ms...`);
  cleanup();

  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    start();
  }, delay).unref();
}

function start() {
  if (isSpawning) {
    logger.warn("Spawn already in progress, skipping...");
    return;
  }
  isSpawning = true;

  const port = process.env.PORT || 10000;
  logger.success(`Starting process with PORT=${port}`);

  cleanup();
  try {
    mainProcess = spawn(process.execPath, ['--no-warnings', SCRIPT_PATH], {
      cwd: __dirname,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        PORT: port,
        NODE_NO_WARNINGS: '1',
      },
    });

    mainProcess.on("error", (error) => {
      logger.error(`Failed to start main process: ${error.message}`);
      scheduleRestart();
    });

    mainProcess.on("exit", (code) => {
      logger.info(`Main process exited with code ${code}`);
      if (restartEnabled) {
        scheduleRestart();
      } else {
        logger.success("Shutdown complete.");
        process.exit(code || 0);
      }
    });

    isSpawning = false;
  } catch (e) {
    logger.error(`Error spawning process: ${e.message}`);
    isSpawning = false;
    scheduleRestart();
  }
}

function shutdown(signal) {
  logger.success(`Received ${signal}. Shutting down gracefully...`);
  cleanup();
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanup);

start();