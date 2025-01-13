const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = ({
    api, font
}) => {
    // Helper to format text in monospace if font is available
    const mono = txt => font.monospace ? font.monospace(txt): txt;

    // Correctly resolve the path to kokoro.json
    const configPath = path.resolve(__dirname, '../kokoro.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config || typeof config !== 'object') {
            throw new Error("Invalid configuration file.");
        }
    } catch (error) {
        console.error("Error reading config file:", error);
        return;
    }

    const timezone = config.timezone || "UTC";

    // Greetings messages based on time of day
    const greetings = {
        morning: ["Good morning! Have a great day!",
            "Rise and shine! Good morning!"],
        afternoon: ["Good afternoon! Keep up the great work!",
            "Time to eat something!"],
        evening: ["Good evening! Relax and enjoy your evening!",
            "Evening! Hope you had a productive day!"],
        night: ["Good night! Rest well!",
            "Tulog na kayo!"]
    };

    // Get a random greeting for a specific time of day
    function greetRandom(timeOfDay) {
        const greetingsList = greetings[timeOfDay] || [];
        return greetingsList.length > 0
        ? greetingsList[Math.floor(Math.random() * greetingsList.length)]: "Hello!";
    }

    // Send greetings to threads
    async function greetThreads(timeOfDay) {
        try {
            const msgTxt = greetRandom(timeOfDay);
            const threads = await api.getThreadList(5, null, ['INBOX']);
            if (!threads || !Array.isArray(threads)) {
                throw new Error("Invalid thread list.");
            }
            for (const thread of threads) {
                if (thread.isGroup) {
                    await api.sendMessage(mono(msgTxt), thread.threadID);
                }
            }
        } catch (error) {}
    }

    // Task: Restart the system
    async function restart() {
        process.exit(0);
    }

    // Task: Clear chat
    async function clearChat() {
        try {
            const threads = await api.getThreadList(25, null, ['INBOX']);
            if (!threads || !Array.isArray(threads)) {
                throw new Error("Invalid thread list.");
            }
            for (const thread of threads) {
                if (!thread.isGroup) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {}
    }

    // Task: Accept pending messages
    async function acceptPending() {
        try {
            const pendingThreads = [...(await api.getThreadList(1, null, ['PENDING'])),
                ...(await api.getThreadList(1, null, ['OTHER']))
            ];
            if (!pendingThreads || !Array.isArray(pendingThreads)) {
                throw new Error("Invalid pending thread list.");
            }
            for (const thread of pendingThreads) {
                await api.sendMessage(mono('📨 Automatically approved by our system.'), thread.threadID);
            }
        } catch (error) {}
    }

    // Task: Post motivational quotes
    async function motivation() {
        try {
            const response = await axios.get("https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json");
            const quotes = response.data;
            if (!Array.isArray(quotes) || quotes.length === 0) {
                throw new Error("Invalid quotes data received.");
            }
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            const quote = `"${randomQuote.quoteText}"\n\n— ${randomQuote.quoteAuthor || "Anonymous"}`;
            await api.createPost(mono(quote));
        } catch (error) {}
    }

    // Schedule greetings based on time of day
    const scheduleGreetings = (timeOfDay, hours) => {
        if (!greetings[timeOfDay]) {
            console.error(`Invalid time of day: ${timeOfDay}`);
            return;
        }
        hours.forEach(hour => {
            cron.schedule(`0 ${hour} * * *`, () => greetThreads(timeOfDay), {
                timezone
            });
        });
    };

    // Ensure cron jobs exist in the configuration
    if (!config.cronJobs || typeof config.cronJobs !== 'object') {
        console.error("Invalid or missing cron jobs configuration.");
        return;
    }

    // Iterate over cron jobs in the configuration
    Object.entries(config.cronJobs).forEach(([key, job]) => {
        if (!job.enabled) return;

        if (key.endsWith('Greetings')) {
            const timeOfDay = key.replace('Greetings', '').toLowerCase();
            scheduleGreetings(timeOfDay, job.hours || []);
        } else {
            const taskMap = {
                restart,
                clearChat,
                acceptPending,
                motivation
            };
            const task = taskMap[key];
            if (task) {
                cron.schedule(job.cronExpression, task, {
                    timezone
                });
            } else {
                console.error(`Unknown task: ${key}`);
            }
        }
    });
};