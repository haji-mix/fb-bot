require("dotenv").config(); // Load environment variables FIRST

const { spawn, execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const SCRIPT_FILE = "kokoro.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

// Define your npm packages, defaulting to 'latest' versions
let npmPackages = [
    { name: "canvas", version: "latest" },
    { name: "kleur", version: "latest" }
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
    // Attempt to run TypeScript setup and handle errors if TypeScript isn't supported
    try {
        if (!fs.existsSync("tsconfig.json")) {
            console.log("Setting up TypeScript...");
            execSync("tsc --init", { stdio: "inherit" });
        } else {
            console.log("TypeScript already set up.");
        }
    } catch (error) {
        // If an error occurs, assume TypeScript isn't supported
        console.error("TypeScript setup failed (likely due to environment limitations). Skipping TypeScript setup...");
    }
}

function isTypeScriptSupported() {
    try {
        execSync("tsc --version", { stdio: "ignore" }); // Try running `tsc` to check if it's installed
        return true;
    } catch (error) {
        return false; // If `tsc` command fails, TypeScript is not supported
    }
}

function start() {
    const port = process.env.PORT || ""; // Access env AFTER dotenv.config()
    
    if (!port) {
        console.error("PORT environment variable is not set. Exiting...");
        process.exit(1);  // Exit the process if the port is empty
    }

    console.log(`Starting main process on PORT=${port}`);

    mainProcess = spawn("node", ["--no-warnings", SCRIPT_PATH], {
        cwd: __dirname,
        stdio: "inherit",
        shell: true,
        env: { ...process.env, PORT: port }, // Pass PORT as env variable
    });

    mainProcess.on("error", (error) => {
        console.error("Failed to start main process:", error);
        process.exit(1);  // Handle start errors
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
        mainProcess.kill("SIGKILL"); // Force kill if necessary
        console.log("Main process killed. Restarting...");
    }
    start();
}

// Ensure dotenv is called before any attempt to use process.env
installPackages(() => {
    // Only set up TypeScript if it's supported
    if (isTypeScriptSupported()) {
        setupTypeScript();
    }
    start();
});
