const { spawn } = require("child_process");
const path = require('path');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const MAX_MEMORY_USAGE = 2000 * 1024 * 1024; // 2000 MB

let mainProcess;

function start() {
    mainProcess = spawn("node", [SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    mainProcess.on("error", (err) => {
        console.error("Error occurred:", err);
    });

    mainProcess.on("close", (exitCode) => {
        if (exitCode === 0 || exitCode === 1) {
            console.log(`STATUS: [${exitCode}] - Process Exited > SYSTEM Rebooting!...`);
            start();
        } else {
            console.error(`[${exitCode}] - Process Exited!`);
        }
    });

    // Monitor memory usage
    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;

        if (memoryUsage > MAX_MEMORY_USAGE) {
            console.error(`Memory usage exceeded ${MAX_MEMORY_USAGE / 1024 / 1024} MB. Attempting to free up memory...`);
            // Attempt to free up memory by performing garbage collection
            if (global.gc) {
                global.gc();
                console.log("Garbage collection performed.");
            } else {
                console.warn("Garbage collection is not exposed. Consider running Node.js with --expose-gc.");
            }
        }
    }, 5000);
}

function gracefulShutdown() {
    console.log("Starting graceful shutdown...");
    if (mainProcess && mainProcess.pid) {
        process.kill(mainProcess.pid, 'SIGTERM');
    }
}

process.on('SIGINT', () => {
    gracefulShutdown();
    process.exit(0);
});

process.on('SIGTERM', () => {
    gracefulShutdown();
    process.exit(0);
});

start();