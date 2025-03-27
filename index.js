require("dotenv").config();
require('events').EventEmitter.prototype._maxListeners = 0;
const { spawn, execSync } = require("child_process");
const path = require("path");

const SCRIPT_FILE = "chatbox.js";
const SCRIPT_PATH = path.join(__dirname, SCRIPT_FILE);

const normalPackages = [
    { name: "canvas", version: "latest" },
    { name: "kleur", version: "latest" }
];

const babelPackages = [
    { name: "@babel/core", version: "latest" },
    { name: "@babel/preset-env", version: "latest" }
];

const enableNormalInstall = true;
const enableDevInstall = false; 
const restartEnabled = process.env.PID !== "0";

let mainProcess;
let restartTimeout;

// Cleanup handlers storage
const cleanupHandlers = {
    sigint: () => {
        console.log('\nReceived SIGINT. Shutting down gracefully...');
        cleanup();
        process.exit(0);
    },
    sigterm: () => {
        console.log('\nReceived SIGTERM. Shutting down gracefully...');
        cleanup();
        process.exit(0);
    },
    exit: () => {
        cleanup();
    }
};

// Initialize process listeners once
function initializeProcessListeners() {
    process.on('SIGINT', cleanupHandlers.sigint);
    process.on('SIGTERM', cleanupHandlers.sigterm);
    process.on('exit', cleanupHandlers.exit);
}

// Remove process listeners (not used in current flow but good to have)
function removeProcessListeners() {
    process.off('SIGINT', cleanupHandlers.sigint);
    process.off('SIGTERM', cleanupHandlers.sigterm);
    process.off('exit', cleanupHandlers.exit);
}

function cleanup() {
    if (restartTimeout) {
        clearTimeout(restartTimeout);
        restartTimeout = null;
    }
    if (mainProcess) {
        mainProcess.removeAllListeners();
        if (mainProcess.pid) {
            try {
                mainProcess.kill('SIGTERM');
            } catch (e) {
                console.error('Error killing process:', e.message);
            }
        }
        mainProcess = null;
    }
}

function getOutdatedPackages() {
    try {
        const outdatedData = JSON.parse(execSync("npm outdated --json", { encoding: "utf8" }));
        return normalPackages.filter(pkg => outdatedData[pkg.name]);
    } catch (error) {
        return normalPackages;
    }
}

function getOutdatedDevPackages() {
    try {
        const outdatedData = JSON.parse(execSync("npm outdated --json", { encoding: "utf8" }));
        return babelPackages.filter(pkg => outdatedData[pkg.name]);
    } catch (error) {
        return babelPackages;
    }
}

function installNormalPackages(callback) {
    if (!enableNormalInstall) {
        console.log("Normal package installation is disabled. Skipping...");
        return callback();
    }

    console.log("Checking normal npm packages...");
    const outdatedPackages = getOutdatedPackages();
    if (outdatedPackages.length === 0) return callback();

    console.log(`Installing/Updating normal packages:`);
    const installPromises = outdatedPackages.map(pkg => {
        return new Promise((resolve) => {
            const version = pkg.version ? `@${pkg.version}` : '';
            console.log(`- Installing ${pkg.name}${version}`);
            const installProcess = spawn("npm", ["install", `${pkg.name}${version}`, "--no-bin-links"], { 
                stdio: "inherit", 
                shell: true 
            });

            installProcess.on("close", (code) => {
                if (code !== 0) {
                    console.error(`Failed to install/update ${pkg.name}. Skipping...`);
                }
                resolve();
            });
        });
    });

    Promise.all(installPromises).then(callback);
}

function installDevPackages(callback) {
    if (!enableDevInstall) {
        console.log("Dev package installation is disabled. Skipping...");
        return callback();
    }

    console.log("Checking dev npm packages...");
    const outdatedDevPackages = getOutdatedDevPackages();
    if (outdatedDevPackages.length === 0) return callback();

    console.log(`Installing/Updating dev packages:`);
    const installPromises = outdatedDevPackages.map(pkg => {
        return new Promise((resolve) => {
            const version = pkg.version ? `@${pkg.version}` : '';
            console.log(`- Installing ${pkg.name}${version} (dev)`);
            const installProcess = spawn("npm", ["install", `${pkg.name}${version}`, "--save-dev", "--no-bin-links"], { 
                stdio: "inherit", 
                shell: true 
            });

            installProcess.on("close", (code) => {
                if (code !== 0) {
                    console.error(`Failed to install/update ${pkg.name}. Skipping...`);
                }
                resolve();
            });
        });
    });

    Promise.all(installPromises).then(callback);
}

function start() {
    const port = process.env.PORT;
    console.log(port ? `Starting main process on PORT=${port}` : "Starting main process without a specific port.");

    // Clean up any existing process
    if (mainProcess) {
        mainProcess.removeAllListeners();
        if (mainProcess.pid) {
            try {
                mainProcess.kill('SIGTERM');
            } catch (e) {
                console.error('Error killing previous process:', e.message);
            }
        }
    }

    mainProcess = spawn("node", [SCRIPT_PATH], {
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
            restartTimeout = setTimeout(restartProcess, 5000);
        } else {
            console.log("Shutdown complete.");
            process.exit(exitCode);
        }
    });
}

function restartProcess() {
    cleanup(); // Clean up before restarting
    start();
}

// Initialize process listeners once at startup
initializeProcessListeners();

// Start the application
installNormalPackages(() => {
    installDevPackages(() => {
        start();
    });
});