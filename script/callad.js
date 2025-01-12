const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

const adminData = JSON.parse(fs.readFileSync(path.join(__dirname, '../kokoro.json'), 'utf-8'));

module.exports["config"] = {
    name: "callad",
    isPrefix: false,
    version: "1.0.0",
    role: 0,
    credits: "Kenneth Panio",
    info: "Send a message to the admin",
    aliases: ['adminmsg',
        'messageadmin',
        'msgadmin',
        'calladmin',
        "feedback",
        "report"],
    cd: 10
};

module.exports["run"] = async ({
    event, args, chat, font
}) => {
    const mono = txt => font.monospace(txt);

    try {
        const message = args.join(' ');

        if (!message) {
            await chat.reply(mono("Please provide a message to send to the admins."));
            return;
        }

        const date = moment.tz("Asia/Manila").format("dddd, MMMM D, YYYY");
        const time = moment.tz("Asia/Manila").format("h:mm A");

        let userName = await chat.userName(event.senderID);
        if (adminData.admins.includes(event.senderID)) {
            userName = 'Anonymous';
        }

        const adminMessage = `✱｡✧𝐅𝐄𝐄𝐃𝐁𝐀𝐂𝐊✧｡✱\n━━━━━━━━━━━━━━━━━━━\n💬 - 𝗠𝗘𝗦𝗦𝗔𝗚𝗘: ${message}\nfrom - ${userName}\n━━━━━━━━━━━━━━━━━━━\n📅 - 𝗗𝗔𝗧𝗘: ${date}\n⏰ - 𝗧𝗜𝗠𝗘: ${time}`;

        for (const adminID of adminData.admins) {
            await chat.reply(adminMessage, adminID);
        }

        chat.reply(mono("Your message has been sent to the admins."));
    } catch (err) {
        chat.reply(mono(err.message || "Failed to send your message to the admins."));
    }
};