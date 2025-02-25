const moment = require('moment-timezone');
const fs = require('fs');
const path = require('path');

module.exports["config"] = {
    name: "announce",
    isPrivate: true,
    version: "1.0.0",
    role: 1,
    credits: "Kenneth Panio",
    info: "Send announcement to all groups",
    aliases: ['sendall', 'messageall', 'msgall', 'chatall', 'noti', 'notiall', 'sendnoti'],
    cd: 10
};

// Safely read and parse the admin data file
let adminData = { admins: [] };
try {
    const filePath = path.join(__dirname, '../kokoro.json');
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    adminData = JSON.parse(fileContent);
} catch (error) {
    console.error('Error reading or parsing kokoro.json:', error);
}

module.exports["run"] = async ({ event, args, chat, font }) => {

    const mono = txt => font.monospace(txt);

    let message = args.join(' ');

    if (!message) {
        chat.reply(mono("Please provide a message."));
        return;
    }

    const date = moment.tz("Asia/Manila").format("dddd, MMMM D, YYYY");
    const time = moment.tz("Asia/Manila").format("h:mm A");

    let userName = await chat.userName(event.senderID);
    
    if (adminData.admins && adminData.admins.includes(event.senderID)) {
        userName = 'Anonymous';
    }

    const list = await chat.threadList();

    if (!list || !Array.isArray(list)) {
        console.error('Thread list is not available or not an array.');
        return;
    }

    for (const item of list) {
        if (item && item.isGroup && item.threadID) {
            await chat.reply(mono(`ANNOUNCEMENT:\n\n${message.trim()}`), item.threadID);
        }
    }
};