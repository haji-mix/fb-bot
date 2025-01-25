const cron = require('node-cron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = async ({
    api, font
}) => {
    const thin = (txt) => (font.thin ? font.thin(txt): txt);

    async function getThreads() {
        try {
            return await api.getThreadList(5, null, ['INBOX']);
        } catch {
            return [];
        }
    }

    async function getPThreads() {
        try {
            const pending = await api.getThreadList(1, null, ['PENDING']);
            const other = await api.getThreadList(1, null, ['OTHER']);
            return [...pending,
                ...other];
        } catch {
            return [];
        }
    }

    const configPath = path.resolve(__dirname, '../kokoro.json');
    let config;
    try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (!config || typeof config !== 'object') throw new Error("Invalid configuration file.");
    } catch (error) {
        console.error("Error reading config file:", error);
        return;
    }

    const timezone = config.timezone || "UTC";

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

    function greetRandom(timeOfDay) {
        const list = greetings[timeOfDay] || [];
        return list.length ? list[Math.floor(Math.random() * list.length)]: "Hello!";
    }

    async function greetThreads(timeOfDay) {
        try {
            const threads = await getThreads();
            if (!threads.length) return;

            const msg = greetRandom(timeOfDay);
            for (const thread of threads) {
                if (thread.isGroup) {
                    try {
                        await api.sendMessage(msg, thread.threadID);
                    } catch (error) {
                        await api.deleteThread(thread.threadID);
                    }
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    function restart() {
        process.exit(0);
    }

    async function clearChat() {
        try {
            const threads = await getThreads();
            if (!threads.length) return;

            for (const thread of threads) {
                if (!thread.isGroup) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function acceptPending() {
        try {
            const pendingThreads = await getPThreads();
            if (!pendingThreads.length) return;

            for (const thread of pendingThreads) {
                try {
                    await api.sendMessage(thin('📨 Automatically approved by our system.'), thread.threadID);
                } catch (error) {
                    await api.deleteThread(thread.threadID);
                }
            }
        } catch (error) {
            console.error(error);
        }
    }


    async function motivation() {
        try {
            const {
                data: quotes
            } = await axios.get("https://raw.githubusercontent.com/JamesFT/Database-Quotes-JSON/master/quotes.json");
            if (!Array.isArray(quotes) || !quotes.length) throw new Error("Invalid quotes data.");

            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            const quote = `"${randomQuote.quoteText}"\n\n— ${randomQuote.quoteAuthor || "Anonymous"}`;
            await api.createPost(thin(quote));
        } catch (error) {
            console.error(error);
        }
    }

    const scheduleGreetings = (timeOfDay, hours) => {
        if (!greetings[timeOfDay]) {
            console.error(`Invalid time of day: ${timeOfDay}`);
            return;
        }

        hours.forEach((hour) => {
            cron.schedule(`0 ${hour} * * *`, () => greetThreads(timeOfDay), {
                timezone
            });
        });
    };

    if (!config.cronJobs || typeof config.cronJobs !== 'object') {
        console.error("Invalid or missing cron jobs configuration.");
        return;
    }

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