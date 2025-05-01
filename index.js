require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");

const { logger } = require("./system/modules");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const restartEnabled = process.env.PID !== "0";
const RESTART_DELAY = 5000; // 5 seconds

// Suppress specific warnings (optional)
process.removeAllListeners('warning'); // Remove default warning handler
process.on('warning', (warning) => {
  // Filter out specific warnings you want to ignore
  if (!warning.message.includes('DeprecationWarning')) {
    logger.chalk.yellow.bold(warning.name, warning.message);
  }
});

let mainProcess = null;
let restartTimeout = null;
let isRestarting = false;

function cleanup() {
    // Clear any pending restart
    if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
    }

    // Clean up main process
    if (mainProcess) {
        // Remove all listeners to prevent memory leaks
        if (mainProcess.stdout) mainProcess.stdout.removeAllListeners();
        if (mainProcess.stderr) mainProcess.stderr.removeAllListeners();
        if (mainProcess.stdin) mainProcess.stdin.removeAllListeners();
        
        mainProcess.removeAllListeners();
        
        // Kill the process if it's still running
        if (!mainProcess.killed && mainProcess.pid) {
            try {
                mainProcess.kill('SIGTERM');
            } catch (e) {
                logger.error('Error killing process:', e.message);
            }
        }
        
        mainProcess = null;
    }
}

function scheduleRestart(delay = RESTART_DELAY) {
    if (isRestarting) return;
    
    isRestarting = true;
    logger.success(`Scheduling restart in ${delay}ms...`);
    cleanup();
    
    // Only set timeout if delay is positive
    if (delay > 0) {
        restartTimeout = setTimeout(() => {
            restartTimeout = null; // Clear reference
            restartProcess();
        }, delay).unref(); // Allow process to exit without waiting for this timeout
    } else {
        restartProcess();
    }
}

function start() {
    isRestarting = false;
    const port = process.env.PORT;
    logger.success(port ? `PROCCESS STARTED WITH PORT=${port}` : "PROCESS STARTED WITH DEFAULT PORT.");

    cleanup(); // Clean up any existing process first

    try {
        mainProcess = spawn(process.execPath, ['--no-warnings', '--no-deprecation', SCRIPT_PATH], {
            cwd: __dirname,
            stdio: "inherit",
            shell: true,
            env: { 
                ...process.env, 
                PORT: port,
                NODE_NO_WARNINGS: '1' // Suppress warnings in child process
            },
        });

        // Explicitly track if we've attached error handlers
        let errorHandled = false;

        const onError = (error) => {
            if (errorHandled) return;
            errorHandled = true;
            console.error("Failed to start main process:", error);
            scheduleRestart();
        };

        const onExit = (exitCode) => {
            if (errorHandled) return;
            errorHandled = true;
            console.log(`Main process exited with code [${exitCode}]`);
            if (restartEnabled) {
                scheduleRestart();
            } else {
                logger.success("Shutdown complete.");
                process.exit(exitCode);
            }
        };

        mainProcess.once("error", onError);
        mainProcess.once("exit", onExit);
        mainProcess.once("close", onExit);

    } catch (e) {
        logger.error("Error spawning process:", e.message);
        scheduleRestart();
    }
}

function restartProcess() {
    logger.success("Performing controlled restart...");
    start();
}

function shutdown(signal) {
    logger.success(`\nReceived ${signal}. Shutting down gracefully...`);
    cleanup();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanup);

start();