require("dotenv").config();

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const npmPackages = ["canvas", "kleur", "typescript"];
const restartEnabled = process.env.PID !== "0";
let mainProcess;

function getOutdatedPackages() {
    try {
        const outdatedData = JSON.parse(execSync("npm outdated -g --json", { encoding: "utf8" }));
        return npmPackages.filter(pkg => outdatedData[pkg]); // Only return outdated ones
    } catch {
        return npmPackages; // Assume all need updating if there's an error
    }
}

function installPackages(callback) {
    console.log("Checking npm packages...");

    const outdatedPackages = getOutdatedPackages();
    if (outdatedPackages.length === 0) return callback();

    console.log(`Installing outdated packages: ${outdatedPackages.join(", ")}`);
    const installProcess = spawn("npm", ["install", "-g", ...outdatedPackages], { stdio: "inherit", shell: true });

    installProcess.on("close", (code) => {
        if (code !== 0) console.error("Failed to install some packages.");
        callback();
    });
}

function setupTypeScript() {
    if (!fs.existsSync("tsconfig.json")) {
        console.log("Setting up TypeScript...");
        execSync("tsc --init", { stdio: "inherit" });
    } else {
        console.log("TypeScript already set up.");
    }
}

function start() {
    require("dotenv").config();
    const port = process.env.PORT || "default";
    console.log(`Starting main process on PORT=${port}`);

    mainProcess = spawn("node", ["--no-warnings", SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, PORT: port },
    });

    mainProcess.on("close", (exitCode) => {
        console.log(`Process exited with code [${exitCode}]`);
        if (restartEnabled) {
            console.log("Restarting in 5 seconds...");
            setTimeout(restartProcess, 5000);
        } else {
            console.log("Shutdown complete.");
            process.exit(exitCode);
        }
    });
}

function restartProcess() {
    if (mainProcess && mainProcess.pid) {
        mainProcess.kill("SIGKILL");
        console.log("Process killed. Restarting...");
    }
    start();
}

installPackages(() => {
    setupTypeScript();
    start();
});
