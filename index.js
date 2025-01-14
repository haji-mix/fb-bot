const {
    spawn
} = require("child_process");
const path = require('path');

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

let mainProcess;

// Always restart if process.env.PID is not '0' (default to true if not provided)
const restartEnabled = process.env.PID !== '0';

function start() {
    console.log("Starting main process...");

    // Start the main process without memory allocation flags
    mainProcess = spawn("node", [
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