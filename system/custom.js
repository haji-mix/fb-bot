const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = ({ api, font }) => {
    // Helper to format text in monospace if font is available
    const mono = txt => (font.monospace ? font.monospace(txt) : txt);

    // Load configuration
    const configPath = path.resolve(__dirname, '../kokoro.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config || typeof config !== 'object') {
            throw new Error("Invalid configuration file.");
        }
    } catch (error) {
        console.error("Error reading configuration file:", error);
        return;
    }

    const timezone = config.timezone || "UTC";

    // Greetings messages based on time of day
    const greetings = {
        morning: [
            "Good morning! Have a great day!",
            "Rise and shine! Good morning!"
        ],
        afternoon: [
            "Good afternoon! Keep up the great work!",
            "Time to eat something!"
        ],
        evening: [
            "Good evening! Relax and enjoy your evening!",
            "Evening! Hope you had a productive day!"
        ],
        night: [
            "Good night! Rest well!",
            "Tulog na kayo!"
        ]
    };

    // Get a random greeting for a specific time of day
    function getRandomGreeting(timeOfDay) {
        const list = greetings[timeOfDay] || [];
        return list.length > 0
            ? list[Math.floor(Math.random() * list.length)]
            : "Hello!";
    }

    // Task: Send greetings to threads
    async function greetThreads(timeOfDay) {
        try {
            const message = getRandomGreeting(timeOfDay);
            const threads = await api.getThreadList(5, null, ['INBOX']);
            if (!Array.isArray(threads) || threads.length === 0) {
                throw new Error("No valid threads found.");
            }
            for (const thread of threads) {
                if (thread.isGroup) {
                    await api.sendMessage(mono(message), thread.threadID);
                }
            }
        } catch (error) {
            console.error(`Error sending ${timeOfDay} greetings:`, error);
        }
    }

    // Task: Restart the system
    async function restart() {
        console.log("Restarting the system...");
        process.exit(0);
    }

    // Task: Clear chat
    async function clearChat() {
        try {
            const threads = await api.getThreadList(25, null, ['INBOX']);
            if (!Array.isArray(threads) || threads.length === 0) {
                throw new Error("No valid threads to clear.");
            }
            for (const thread of threads) {
                if (!thread.isGroup) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {
            console.error("Error clearing chat:", error);
        }
    }

    // Task: Accept pending messages
    async function acceptPending() {
        try {
            const pendingThreads = [
                ...(await api.getThreadList(1, null, ['PENDING'])),
                ...(await api.getThreadList(1, null, ['OTHER']))
            ];
            
            if (!Array.isArray(pendingThreads) || pendingThreads.length === 0) {
                throw new Error("No pending threads to accept.");
            }
            for (const thread of pendingThreads) {
                await api.sendMessage(
                    mono('📨 Automatically approved by our system.'),
                    thread.threadID
                );
            }
        } catch (error) {
            console.error("Error accepting pending messages:", error);
        }
    }

    // Task: Post motivational quotes
    async function postMotivation() {
        try {
            const { data: quotes } = await axios.get(
                "https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json"
            );
            if (!Array.isArray(quotes) || quotes.length === 0) {
                throw new Error("No valid quotes received.");
            }
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            const quote = `"${randomQuote.quoteText}"\n\n— ${randomQuote.quoteAuthor || "Anonymous"}`;
            await api.createPost(mono(quote));
        } catch (error) {
            console.error("Error posting motivational quote:", error);
        }
    }

    // Schedule greetings based on time of day
    function scheduleGreetings(timeOfDay, hours) {
        if (!greetings[timeOfDay]) {
            console.error(`Invalid time of day: ${timeOfDay}`);
            return;
        }
        hours.forEach(hour => {
            cron.schedule(`0 ${hour} * * *`, () => greetThreads(timeOfDay), { timezone });
        });
    }

    // Map of task names to functions
    const tasks = {
        restart,
        clearChat,
        acceptPending,
        postMotivation
    };

    // Configure cron jobs
    if (!config.cronJobs || typeof config.cronJobs !== 'object') {
        console.error("Invalid or missing cron jobs configuration.");
        return;
    }

    Object.entries(config.cronJobs).forEach(([key, job]) => {
        if (!job.enabled) return;

        if (key.endsWith("Greetings")) {
            const timeOfDay = key.replace("Greetings", "").toLowerCase();
            scheduleGreetings(timeOfDay, job.hours || []);
        } else if (tasks[key]) {
            cron.schedule(job.cronExpression, tasks[key], { timezone });
        } else {
            console.error(`Unknown task: ${key}`);
        }
    });
};
