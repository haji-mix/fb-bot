require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const restartEnabled = process.env.PID !== "0";
const RESTART_DELAY = 5000; // 5 seconds

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
                console.error('Error killing process:', e.message);
            }
        }
        
        mainProcess = null;
    }
}

function scheduleRestart(delay = RESTART_DELAY) {
    if (isRestarting) return;
    
    isRestarting = true;
    console.log(`Scheduling restart in ${delay}ms...`);
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
    console.log(port ? `Starting main process on PORT=${port}` : "Starting main process without a specific port.");

    cleanup(); // Clean up any existing process first

    try {
        mainProcess = spawn(process.execPath, [SCRIPT_PATH], {
            cwd: __dirname,
            stdio: "inherit",
            shell: true,
            env: { ...process.env, PORT: port },
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
                console.log("Shutdown complete.");
                process.exit(exitCode);
            }
        };

        mainProcess.once("error", onError);
        mainProcess.once("exit", onExit);
        mainProcess.once("close", onExit);

    } catch (e) {
        console.error("Error spawning process:", e.message);
        scheduleRestart();
    }
}

function restartProcess() {
    console.log("Performing controlled restart...");
    start();
}

function shutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    cleanup();
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('exit', cleanup);

// Handle uncaught exceptions to prevent memory leaks
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    cleanup();
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    cleanup();
    process.exit(1);
});

start();
