require("dotenv").config(); // Load environment variables FIRST

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);
const HEARTBEAT_FILE = path.join(__dirname, "heartbeat.txt");
const PM2_PROCESS_NAME = "autobot"; // PM2 process name

// Define your npm packages, defaulting to 'latest' versions
let npmPackages = [
    { name: "canvas", version: "latest" },
    { name: "kleur", version: "latest" },
    { name: "pm2", version: "latest" }
];

// Add TypeScript-related packages only if TypeScript is supported
if (isTypeScriptSupported()) {
    npmPackages.push(
        { name: "typescript", version: "latest" },
        { name: "ts-node", version: "latest" }
    );
}

const restartEnabled = process.env.RESTART_ENABLED === "true"; // Explicit boolean check
let mainProcess;

function updateHeartbeat() {
    fs.writeFileSync(HEARTBEAT_FILE, Date.now().toString());
}

// Update heartbeat every 5 seconds
setInterval(updateHeartbeat, 5000);

function getOutdatedPackages() {
    try {
        const outdatedData = JSON.parse(execSync("npm outdated -g --json", { encoding: "utf8" }));
        return npmPackages.filter(pkg => outdatedData[pkg.name]); // Look for outdated packages
    } catch (error) {
        console.error("Error checking for outdated packages:", error); // Log the error
        return npmPackages; // Assume all need updating on error
    }
}

function installPackages(callback) {
    console.log("Checking npm packages...");

    const outdatedPackages = getOutdatedPackages();
    if (outdatedPackages.length === 0) return callback();

    console.log(`Installing/Updating packages:`);
    outdatedPackages.forEach(pkg => {
        const version = pkg.version ? `@${pkg.version}` : ''; // Default to latest if no version
        console.log(`- Installing ${pkg.name}${version}`);
        const installProcess = spawn("npm", ["install", "-g", `${pkg.name}${version}`], { stdio: "inherit", shell: true });

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
        console.error("TypeScript setup failed. Skipping...");
    }
}

function isTypeScriptSupported() {
    try {
        execSync("tsc --version", { stdio: "ignore" }); // Try running `tsc` to check if it's installed
        return true;
    } catch (error) {
        return false;
    }
}

function start() {
    if (!process.env.PM2) {
        try {
            execSync(`pm2 start ${__filename} --name ${PM2_PROCESS_NAME}`, { stdio: "inherit" });
            console.log(`Process started with PM2 as '${PM2_PROCESS_NAME}'.`);
            process.exit(0);
        } catch (error) {
            console.error("Failed to start with PM2:", error);
            process.exit(1);
        }
    }

    const port = process.env.PORT || "";
    console.log(`Starting main process on PORT=${port || "Default"}`);

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
        console.log(`Main process exited with code [${exitCode}]. PM2 will handle restart.`);
    });
}

// Ensure dotenv is called before any attempt to use process.env
installPackages(() => {
    if (isTypeScriptSupported()) {
        setupTypeScript();
    }
    start();
});
