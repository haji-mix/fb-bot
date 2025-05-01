require("dotenv").config();
const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const restartEnabled = process.env.PID !== "0";

let mainProcess;
let restartTimeout;
let isRestarting = false;

function cleanup() {
    if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
    }
    if (mainProcess) {
        mainProcess.removeAllListeners();
        if (mainProcess.pid) {
            try {
                mainProcess.kill('SIGTERM');
            } catch (e) {
                console.error('Error killing process:', e.message);
            }
        }
        mainProcess = null;
    }
}

function scheduleRestart(delay = 0) {
    if (isRestarting) return;
    
    isRestarting = true;
    console.log(`Scheduling restart in ${delay}ms...`);
    cleanup();
    
    if (delay > 0) {
        restartTimeout = setTimeout(() => {
            restartProcess();
        }, delay);
    } else {
        restartProcess();
    }
}

function start() {
    isRestarting = false;
    const port = process.env.PORT;
    console.log(port ? `Starting main process on PORT=${port}` : "Starting main process without a specific port.");

    if (mainProcess) {
        mainProcess.removeAllListeners();
        if (mainProcess.pid) {
            try {
                mainProcess.kill('SIGTERM');
            } catch (e) {
                console.error('Error killing previous process:', e.message);
            }
        }
    }

    mainProcess = spawn("node", [SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, PORT: port },
    });

    mainProcess.on("error", (error) => {
        console.error("Failed to start main process:", error);
        scheduleRestart(5000);
    });

    mainProcess.on("close", (exitCode) => {
        console.log(`Main process exited with code [${exitCode}]`);
        if (restartEnabled) {
            scheduleRestart(5000);
        } else {
            console.log("Shutdown complete.");
            process.exit(exitCode);
        }
    });
}

function restartProcess() {
    console.log("Performing controlled restart...");
    cleanup();
    start();
}

process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    cleanup();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    cleanup();
    process.exit(0);
});

process.on('exit', () => {
    cleanup();
});

start();