const { spawn, fork } = require("child_process");
const path = require('path');
const cluster = require('cluster');
const os = require('os');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const MAX_MEMORY_USAGE = Number.MAX_SAFE_INTEGER;

function startWorker() {
    const mainProcess = spawn("node", [SCRIPT_PATH], {
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
            startWorker();
        } else if (exitCode === 1) {
            console.log(`ERROR: [${exitCode}] - System Rebooting!...`);
            startWorker();
        } else if (exitCode === 137) {
            console.log(`POTENTIAL DDOS: [${exitCode}] - Out Of Memory Restarting...`);
            startWorker();
        } else if (exitCode === 134) {
            console.log(`REACHED HEAP LIMIT ALLOCATION: [${exitCode}] - Out Of Memory Restarting...`);
            startWorker();
        } else {
            console.error(`[${exitCode}] - Process Exited!`);
        }
    });

    // Monitor memory usage
    const memoryCheckInterval = setInterval(() => {
        const memoryUsage = process.memoryUsage().heapUsed;

        if (memoryUsage > MAX_MEMORY_USAGE) {
            console.error(`Memory usage exceeded ${MAX_MEMORY_USAGE / 1024 / 1024} MB. Restarting server...`);

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
    for (const worker of Object.values(cluster.workers)) {
        worker.kill('SIGTERM');
    }
}

if (cluster.isMaster) {
    // Fork workers for each CPU core
    const numCPUs = os.cpus().length;
    console.warn(`Master process: Forking ${numCPUs} workers...`);

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // Monitor workers
    cluster.on('exit', (worker, code, signal) => {
        console.warn(`Worker ${worker.process.pid} died with code ${code}, restarting...`);
        cluster.fork(); // Restart the worker
    });

    process.on('SIGINT', () => {
        gracefulShutdown();
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        gracefulShutdown();
        process.exit(0);
    });
} else {
    startWorker();
}
