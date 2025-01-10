const { spawn } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// Set MAX_MEMORY_USAGE in gigabytes (GB)
const MAX_MEMORY_USAGE_GB = 20;  // 2 GB

let mainProcess;

function start() {
    // Convert MAX_MEMORY_USAGE from GB to MB (1 GB = 1024 MB)
    const maxMemoryMB = MAX_MEMORY_USAGE_GB * 1024;  // Convert to MB

    mainProcess = spawn("node", ["--expose-gc", `--max-old-space-size=${maxMemoryMB}`, SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    mainProcess.on("error", (err) => {
        console.error("Error occurred:", err);
    });

    mainProcess.on("close", (exitCode) => {
        if (exitCode === 137) {
            // Process was killed due to memory constraints, restart it
            console.log("STATUS: [137] - Process was killed due to memory issues. Restarting...");
            start(); 
        } else if (exitCode === 0 || exitCode === 1) {
            console.log(`STATUS: [${exitCode}] - Process Exited > SYSTEM Rebooting!...`);
            start();
        } else {
            console.error(`[${exitCode}] - Process Exited!`);
        }
    });

    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;

        if (memoryUsage > MAX_MEMORY_USAGE_GB * 1024 * 1024) {
            console.error(`Memory usage exceeded ${MAX_MEMORY_USAGE_GB} GB. Attempting to free up memory...`);

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
