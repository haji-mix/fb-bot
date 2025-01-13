const { spawn } = require("child_process");
const path = require('path');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// Set the memory limit to 100% of 8 GB (10,240 MB)
const MAX_MEMORY_THRESHOLD = 8 * 1024 * 1024 * 1024;
let mainProcess;

// Always restart if process.env.PID is not provided (default to true)
const restartEnabled = process.env.PID !== '0'; // Default to true if process.env.PID is not '0'

function calculateMaxMemoryUsage() {
    let newMemoryLimit = MAX_MEMORY_THRESHOLD;

    // Return memory in MB (convert bytes to MB)
    return Math.floor(newMemoryLimit / 1024 / 1024);
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
        console.log(`Process exited with code [${exitCode}]`);
        if (restartEnabled) {
            console.log("Restarting process...");
            restartProcess();
        } else {
            console.log("Shutdown initiated...");
            process.exit(exitCode);  // Exit with the same exit code
        }
    });

    // Monitor memory usage
    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;
        if (memoryUsage > MAX_MEMORY_THRESHOLD) {
            console.error(`Memory usage exceeded threshold. Restarting server...`);

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

function restartProcess() {
    // Ensure process is killed before restart
    if (mainProcess && mainProcess.pid) {
        mainProcess.kill('SIGKILL');
        console.log('Main process killed. Restarting...');
    }
    start();
}

start();
