const os = require('os');
const pidusage = require('pidusage');

module.exports["config"] = {
    name: "uptime",
    version: "1.0.3",
    role: 0,
    credits: "cliff",
    description: "Displays system uptime and resource usage",
    hasPrefix: false,
    cooldowns: 5,
    aliases: ["up"]
};

// Convert bytes to readable format
function byte2mb(bytes) {
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    let l = 0, n = parseInt(bytes, 10) || 0;
    while (n >= 1024 && ++l) n = n / 1024;
    return `${n.toFixed(1)} ${units[l]}`;
}

// Format uptime
function getUptime() {
    const uptime = os.uptime();
    const days = Math.floor(uptime / (3600 * 24));
    const hours = Math.floor((uptime % (3600 * 24)) / 3600);
    const mins = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);

    return `${days}d ${hours}h ${mins}m ${seconds}s`;
}

// Main function
module.exports["run"] = async ({ api, event, fonts, chat }) => {
    try {
        const processUptime = process.uptime();
        const hours = Math.floor(processUptime / 3600);
        const minutes = Math.floor((processUptime % 3600) / 60);
        const seconds = Math.floor(processUptime % 60);
        
        const pingStart = Date.now();

        const usage = await pidusage(process.pid);
        const totalMem = byte2mb(os.totalmem());
        const freeMem = byte2mb(os.freemem());
        const usedMem = byte2mb(os.totalmem() - os.freemem());
        const cores = os.cpus().length;
        const osInfo = {
            platform: os.platform(),
            architecture: os.arch(),
            release: os.release()
        };

        const ping = Date.now() - pingStart;

        const response = `
        ⚙️ System Information\n───────────────────────\n🔹 Uptime: ${getUptime()}\n🔹 Bot Uptime: ${hours}h ${minutes}m ${seconds}s\n🔹 CPU Usage: ${usage.cpu.toFixed(1)}%\n🔹 RAM Usage: ${usedMem} / ${totalMem} (Free: ${freeMem})\n🔹 Cores: ${cores}\n🔹 OS: ${osInfo.platform} (${osInfo.architecture})\n🔹 OS Version: ${osInfo.release}\n🔹 Ping: ${ping}ms
        `;

        return chat.reply(fonts.thin(response.trim()));

    } catch (error) {
        console.error("Error fetching system info:", error);
        return chat.reply("❌ An error occurred while retrieving system information.");
    }
};
