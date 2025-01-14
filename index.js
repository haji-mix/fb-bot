const { spawn } = require("child_process");
const path = require('path');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const MAX_MEMORY_THRESHOLD = 2 * 1024 * 1024 * 1024; // 2 GB memory limit (reduce this based on your server capacity)
let mainProcess;

// Always restart if process.env.PID is not '0' (default to true if not provided)
const restartEnabled = process.env.PID !== '0';

// Calculate the memory limit in MB
function calculateMaxMemoryUsage() {
    return Math.floor(MAX_MEMORY_THRESHOLD / 1024 / 1024); // Convert bytes to MB
}

function start() {
    const memoryLimitMB = calculateMaxMemoryUsage();
    console.log(`Allocating ${memoryLimitMB} MB of memory for the Node.js process`);

    // Start the main process with specific memory allocation and flags
    mainProcess = spawn("node", [
        `--max-old-space-size=${memoryLimitMB}`, 
        "--trace-warnings", 
        "--async-stack-traces", 
        "--no-warnings", 
        SCRIPT_PATH
    ], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true
    });

    // Handle errors in the main process
    mainProcess.on("error", (err) => {
        console.error("Error occurred while starting the process:", err);
    });

    // Handle process exit
    mainProcess.on("close", (exitCode) => {
        console.log(`Process exited with code [${exitCode}]`);
        if (restartEnabled) {
            console.log("Restarting process...");
            restartProcess(); // Restart process after exit
        } else {
            console.log("Shutdown initiated...");
            process.exit(exitCode); // Exit with the same exit code
        }
    });

    // Monitor memory usage at regular intervals
    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > MAX_MEMORY_THRESHOLD) {
            console.error("Memory usage exceeded threshold. Restarting process...");

            // Kill process and restart if memory usage is exceeded
            if (mainProcess && mainProcess.pid) {
                mainProcess.kill('SIGKILL');
                clearInterval(memoryCheckInterval);
                if (restartEnabled) {
                    console.log("Restarting process...");
                    restartProcess(); // Restart process after killing it
                } else {
                    console.log("Restart is disabled. Shutting down.");
                    process.exit(1); // Exit with error code (non-zero) to indicate abnormal termination
                }
            }
        }
    }, 5000);
}

// Restart the process after killing it
function restartProcess() {
    if (mainProcess && mainProcess.pid) {
        mainProcess.kill('SIGKILL');
        console.log('Main process killed. Restarting...');
    }
    start();
}

start();
