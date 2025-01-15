const axios = require('axios');
const randomUseragent = require('random-useragent');

const MAX_EMAIL_COUNT = 10;
const DEFAULT_DISPLAY_LIMIT = 5;
const CHECK_DELAY_MS = 1000; // Delay between checks in milliseconds
const API_BASE_URL = "https://www.1secmail.com/api/v1/";

const generateRandomUsername = (length) => {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({
        length
    }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
};

const getActiveDomains = async () => {
    try {
        const {
            data
        } = await axios.get(`${API_BASE_URL}?action=getDomainList`);
        return data.length ? data: [];
    } catch (error) {
        console.log('Error fetching active domains:', error);
        return [];
    }
};

const checkInbox = async (email, headers, chat, mono, isManualCheck) => {
    const [username,
        domain] = email.split('@').map(part => part.replace(/\(\.\)/g, '.'));
    const fetchMessages = async () => {
        const {
            data
        } = await axios.get(`${API_BASE_URL}?action=getMessages&login=${username}&domain=${domain}`, {
                headers
            });
        return data;
    };

    const fetchMessageDetails = async (messageId) => {
        const {
            data
        } = await axios.get(`${API_BASE_URL}?action=readMessage&login=${username}&domain=${domain}&id=${messageId}`, {
                headers
            });
        return data;
    };

    const processMessages = async (messages) => {
        let messageText = '';
        for (const {
            id
        } of messages.slice(0, DEFAULT_DISPLAY_LIMIT)) {
            const details = await fetchMessageDetails(id);
            const attachments = details.attachments.map(a => `📎 Attachment: ${a.filename} (${a.size} bytes)`).join('\n');
            messageText += `👤 𝗦𝗘𝗡𝗗𝗘𝗥: ${details.from}\n🎯 𝗦𝗨𝗕𝗝𝗘𝗖𝗧: ${details.subject || 'No Subject 🎯'}\n📅 𝗗𝗔𝗧𝗘: ${details.date}\n\n${details.textBody || details.body}\n\n${attachments}\n\n`;
        }
        chat.reply(mono(messageText));
        chat.react("📮");
    };

    if (isManualCheck) {
        try {
            const messages = await fetchMessages();
            if (messages.length) await processMessages(messages);
            else chat.reply(mono(`No messages found for ${email}.`));
        } catch (error) {
            chat.reply(mono(`Error checking inbox: ${error.message}`));
        }
    } else {
        const startTime = Date.now();
        while (Date.now() - startTime < 120000) {
            try {
                const messages = await fetchMessages();
                if (messages.length) {
                    await processMessages(messages);
                    return;
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                chat.reply(mono(`Error checking inbox: ${error.message}`));
                return;
            }
        }
    }
};

module.exports = {
    config: {
        name: "1secmail",
        version: "1.0.1",
        info: "Generates random email from www.1secmail.com and fetches messages from inbox.",
        credits: "Kenneth Panio",
        type: "Accounting",
        role: 0,
        aliases: ['genmail',
            'dumpmail',
            'mail',
            'dump'],
        usage: "[custom name or count (optional)] or inbox [email] or domains",
        guide: `tempmail > generates a random email\n
        tempmail [custom name] > generates a random email with custom name\n
        tempmail [count] > generates multiple random emails\n
        tempmail inbox [email] > checks inbox of the generated email\n
        tempmail domains > lists all active domains for email generation\n
        tempmail help > displays this guide`,
    },

    async run({
        font, event, args, chat
    }) {
        const mono = txt => font.monospace(txt);
        try {
            const userAgent = randomUseragent.getRandom();
            const headers = {
                'User-Agent': userAgent
            };
            const domains = await getActiveDomains();

            if (args[0] === 'help') return chat.reply(mono(module.exports.config.guide));

            if (args[0] === 'inbox') {
                if (!args[1]) return chat.reply(mono("Please provide an email address for the inbox."));
                const email = args[1].replace(/\(\.\)/g, '.');
                if (!domains.includes(email.split('@')[1])) return chat.reply(mono("The domain of the provided email is not in the active domains list."));
                await checkInbox(email, headers, chat, mono, true);

            } else if (['domains', 'domain', 'list'].includes(args[0])) {
                if (!domains.length) return chat.reply(mono("No active domains available at the moment."));
                const domainList = `Active domains for email generation:\n${domains.map((d, i) => `${i + 1}. ${d.replace(/\./g, '(.)')}`).join('\n')}\n`;
                chat.reply(mono(domainList));

            } else {
                const count = isNaN(args[0]) ? 1: Math.min(parseInt(args[0]), MAX_EMAIL_COUNT);
                if (count > MAX_EMAIL_COUNT) return chat.reply(`Maximum allowed count is ${MAX_EMAIL_COUNT}.`);
                if (!domains.length) return chat.reply(mono("No active domains available for email generation."));

                const generatedEmails = Array.from({
                    length: count
                }, () => {
                    let username;
                    if (!isNaN(args[0]) || !args[0]) {
                        username = generateRandomUsername(Math.floor(Math.random() * (12 - 6 + 1)) + 6);
                    } else {
                        username = args.join('');
                    }
                    const domain = domains[Math.floor(Math.random() * domains.length)];
                    return `${username}@${domain.replace(/\./g, '(.)')}`;
                });

                chat.reply(generatedEmails.join('\n'));

                if (count === 1) {
                    const email = generatedEmails[0].replace(/\(\.\)/g, '.');
                    await checkInbox(email, headers, chat, mono, false);
                }
            }
        } catch (error) {
            chat.reply(mono(error.message));
        }
    }
};