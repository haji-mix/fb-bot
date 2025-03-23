require("dotenv").config();
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
    outdatedPackages.forEach(pkg => {
        const version = pkg.version ? `@${pkg.version}` : '';
        console.log(`- Installing ${pkg.name}${version}`);
        const installProcess = spawn("npm", ["install", `${pkg.name}${version}`, `--no-bin-links`], { stdio: "inherit", shell: true });

        installProcess.on("close", (code) => {
            if (code !== 0) {
                console.error(`Failed to install/update ${pkg.name}. Skipping...`);
            }
        });
    });

    callback();
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
    outdatedDevPackages.forEach(pkg => {
        const version = pkg.version ? `@${pkg.version}` : '';
        console.log(`- Installing ${pkg.name}${version} (dev)`);
        const installProcess = spawn("npm", ["install", `${pkg.name}${version}`, `--save-dev`, `--no-bin-links`], { stdio: "inherit", shell: true });

        installProcess.on("close", (code) => {
            if (code !== 0) {
                console.error(`Failed to install/update ${pkg.name}. Skipping...`);
            }
        });
    });

    callback();
}


function start() {
    const port = process.env.PORT;
    if (port) {
        console.log(`Starting main process on PORT=${port}`);
    } else {
        console.log("No PORT set, starting main process without a specific port.");
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


installNormalPackages(() => {
    installDevPackages(() => {
        start();
    });
});