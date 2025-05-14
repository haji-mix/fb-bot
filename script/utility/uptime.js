const os = require("os");
const axios = require("axios");

module.exports["config"] = {
    name: "uptime",
    aliases: ["up"],
    info: "Shows system uptime and detailed OS specifications with a sleek interface.",
    prefix: true,
    cd: 3,
    category: "utility",
    credits: "Kenneth Panio"
};

module.exports["run"] = async ({ chat, font, event, format }) => {
    try {
        const uptimeSeconds = os.uptime();
        
        const days = Math.floor(uptimeSeconds / (3600 * 24));
        const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((uptimeSeconds % 3600) / 60);
        const seconds = Math.floor(uptimeSeconds % 60);
        const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

        const osType = os.type();
        const platform = os.platform(); 
        const release = os.release(); 
        const arch = os.arch(); 
        const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2); 
        const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2); 
        const usedMem = (totalMem - freeMem).toFixed(2); 
        const specs = [
            `💻 **OS**: ${osType}`,
            `🌐 **Platform**: ${platform}`,
            `📌 **Release**: ${release}`,
            `⚙️ **Architecture**: ${arch}`,
            `🧠 **Total Memory**: ${totalMem} GB`,
            `📈 **Used Memory**: ${usedMem} GB`,
            `📉 **Free Memory**: ${freeMem} GB`,
            `⏳ **Uptime**: ${uptimeString}`
        ].join("\n");

        const coolTitle = "SYSTEM INFORMATION";

        const responseMessage = format({
            title: coolTitle,
            content: specs,
            noFormat: true,
            contentFont: "none"
        });

        await chat.reply(responseMessage);
    } catch (error) {
        await chat.reply(font.thin(error.stack || error.message || "⚠️ Error fetching system info!"));
    }
};