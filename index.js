const { spawn } = require("child_process");
const path = require("path");
const { logger } = require("./system/logger");

const SCRIPT_FILE = "main.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const restartEnabled = process.env.PID !== "0";
// ok sir
let mainProcess;

function start() {
    mainProcess = spawn("node", ["--no-deprecation", "--no-warnings", SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
    });

    mainProcess.on("error", (err) => {
        logger.error("Error occurred while starting the process:", err);
    });

    mainProcess.on("close", (exitCode) => {
        console.log(`Process exited with code [${exitCode}]`);
        if (restartEnabled) {
            logger.success("Restarting process...");
            restartProcess();
        } else {
            console.log("Shutdown initiated...");
            process.exit(exitCode);
        }
    });
}

function restartProcess() {
    if (mainProcess && mainProcess.pid) {
        mainProcess.kill("SIGKILL");
        logger.success("Main process killed. Restarting...");
    }
    start();
}

start();
