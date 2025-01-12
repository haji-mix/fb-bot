const { spawn } = require("child_process");
const path = require('path');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const MAX_MEMORY_THRESHOLD = 8000 * 1024 * 1024; // 8000 MB, threshold when to scale up memory
let mainProcess;

function calculateMaxMemoryUsage() {
    const currentHeapUsage = process.memoryUsage().heapUsed;
    console.log(`Current heap usage: ${currentHeapUsage / 1024 / 1024} MB`);  // Logs the current memory usage in MB
    
    // Increase memory by 100% (double the current memory)
    let newMemoryLimit = currentHeapUsage * 2;

    // Set a minimum memory limit of 512 MB to ensure higher allocation
    newMemoryLimit = Math.max(newMemoryLimit, 512 * 1024 * 1024); // 512 MB minimum

    // Ensure it doesn't exceed MAX_MEMORY_THRESHOLD (8 GB in this case)
    newMemoryLimit = Math.min(newMemoryLimit, MAX_MEMORY_THRESHOLD);

    return Math.floor(newMemoryLimit / 1024 / 1024); // Return memory in MB
}

function start() {
    const memoryLimitMB = calculateMaxMemoryUsage();
    console.log(`Allocating ${memoryLimitMB} MB of memory for the Node.js process`);

    mainProcess = spawn("node", [`--max-old-space-size=${memoryLimitMB}`, SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    mainProcess.on("error", (err) => {
        console.error("Error occurred:", err);
    });

    mainProcess.on("close", (exitCode) => {
        if (exitCode === 0) {
            console.log(`STATUS: [${exitCode}] - Process Exited > SYSTEM Rebooting!...`);
            start();
        } else if (exitCode === 1) {
            console.log(`ERROR: [${exitCode}] - System Rebooting!...`);
            start();
        } else if (exitCode === 137) {
            console.log(`POTENTIAL DDOS: [${exitCode}] - Out Of Memory Restarting...`);
            start();
        } else if (exitCode === 134) {
            console.log(`REACHED HEAP LIMIT ALLOCATION: [${exitCode}] - Out Of Memory Restarting...`);
            start();
        } else {
            console.error(`[${exitCode}] - Process Exited!`);
        }
    });

    // Monitor memory usage
    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > MAX_MEMORY_THRESHOLD) {
            console.error(`Memory usage exceeded threshold. Restarting server...`);

            // Graceful shutdown procedure
            if (mainProcess && mainProcess.pid) {
                mainProcess.kill('SIGTERM');
                clearInterval(memoryCheckInterval);
            }
        }
    }, 5000);
}

function gracefulShutdown() {
    console.log("Starting graceful shutdown...");
    if (mainProcess && mainProcess.pid) {
        mainProcess.kill('SIGTERM');
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
