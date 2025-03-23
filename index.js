require("dotenv").config();
const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

let npmPackages = [
    { name: "canvas", version: "latest" },
    { name: "kleur", version: "latest" }
];

if (isTypeScriptSupported()) {
    npmPackages.push(
        { name: "typescript", version: "latest" },
        { name: "ts-node", version: "latest" }
    );
}

const restartEnabled = process.env.PID !== "0";
let mainProcess;

function getOutdatedPackages() {
    try {
        const outdatedData = JSON.parse(execSync("npm outdated -g --json", { encoding: "utf8" }));
        return npmPackages.filter(pkg => outdatedData[pkg.name]);
    } catch (error) {
        return npmPackages;
    }
}

function installPackages(callback) {
    console.log("Checking npm packages...");

    const outdatedPackages = getOutdatedPackages();
    if (outdatedPackages.length === 0) return callback();

    console.log(`Installing/Updating packages:`);
    outdatedPackages.forEach(pkg => {
        const version = pkg.version ? `@${pkg.version}` : '';
        console.log(`- Installing ${pkg.name}${version}`);
        const installProcess = spawn("npm", ["install", "-g", `${pkg.name}${version}`, `--no-bin-links`], { stdio: "inherit", shell: true });

        installProcess.on("close", (code) => {
            if (code !== 0) {
                console.error(`Failed to install/update ${pkg.name}. Skipping...`);
            }
        });
    });

    callback();
}

function setupTypeScript() {
    try {
        if (!fs.existsSync("tsconfig.json")) {
            console.log("Setting up TypeScript...");
            execSync("tsc --init", { stdio: "inherit" });
        } else {
            console.log("TypeScript already set up.");
        }
    } catch (error) {
        console.error("TypeScript setup failed (likely due to environment limitations). Skipping TypeScript setup...");
    }
}

function isTypeScriptSupported() {
    try {
        execSync("tsc --version", { stdio: "ignore" });
        return true;
    } catch (error) {
        return false;
    }
}

function start() {
    const port = process.env.PORT;
    if (port) {
        console.log(`Starting main process on PORT=${port}`);
    } else {
        console.log("No PORT set, starting main process without a specific port.");
    }

    mainProcess = spawn("node", ["--no-warnings", SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, PORT: port }, 
    });

    mainProcess.on("error", (error) => {
        console.error("Failed to start main process:", error);
        process.exit(1); 
    });

    mainProcess.on("close", (exitCode) => {
        console.log(`Main process exited with code [${exitCode}]`);

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
        console.log("Main process killed. Restarting...");
    }
    start();
}

installPackages(() => {
    if (isTypeScriptSupported()) {
        setupTypeScript();
    }
    start();
});
