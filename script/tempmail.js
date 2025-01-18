const axios = require('axios');

module.exports["config"] = {
  name: "tempv2",
  version: "1.0.1",
  isPrefix: false,
  info: "Generates random email and fetches messages from inbox using inboxes.com",
  credits: "Kenneth Panio",
  type: "Accounting",
  role: 0,
  aliases: ['genmailv2', 'dumpmailv2', 'mailv2', 'dumpv2'],
  usage: "[count (optional)] or inbox [email] [message limit to show (optional)]",
  guide: 'tempmailv2 > gives you random generated email\ntempmailv2 inbox [generated email] > to check inbox of generated email',
};

module.exports["run"] = async ({ font, event, args, chat }) => {
  var mono = txt => font.monospace(txt);
  const DOMAIN_URL = 'https://inboxes.com/api/v2/domain';
  const MAX_EMAIL_COUNT = 10;
  const DEFAULT_DISPLAY_LIMIT = 5;
  
  const names = ['john', 'emma', 'alex', 'sophia', 'hajime', 'nagumo', "mark", 'ivana', 'atomic', 'kenneth', 'jasrel', 'pogi', 'bilat', 'kiffy', 'fuego', 'haponesa', 'elonmusk', 'markzuck', 'johnnysins', 'lexilore', 'lexielore', 'muhammed', 'jake', 'shiki', 'rpiers', 'dump', 'mamamo', 'pakyu', 'icons', 'project', 'null', 'dummy', 'temp', 'codify', 'coders', 'bruh', 'mooo', 'chicken', 'meat', 'ishowspeed', 'naruto', 'sasuke', 'deku', 'kakashi', 'yuji', 'itadori', 'zoro','luffy', 'discord', 'nigga', 'lumine','nahida','raiden', 'shogun', 'sigma','sigbin','jasper', 'pearl', 'isaac', 'newton', 'booba', 'vader', 'mwuah', 'minecraft', 'nikke', 'genshin', 'chatgpt', 'blackbox', 'box', 'zen', 'zenith','terrablade', 'kratos', 'gizmo', 'bloxfruit', 'gusion', 'krazy', 'dyrroth', 'draco'];

  function generateRandomId() {
    const minLength = 1;
    const maxLength = 4;
    const length = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
    const characters = '0123456789';
    let randomId = '';

    for (let i = 0; i < length; i++) {
      randomId += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    return randomId;
}


  async function getDomains() {
    const response = await axios.get(DOMAIN_URL);
    return response.data.domains;
  }

  function generateTempEmail(names, domains) {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomString = generateRandomId();
    const randomDomain = domains[Math.floor(Math.random() * domains.length)].qdn;
    return `${randomName}${randomString}@${randomDomain}`;
  }

  async function checkInbox(email) {
    const sanitizedEmail = email.replace(/\(\.\)/g, '.');
    const encodedEmail = encodeURIComponent(sanitizedEmail);
    const inboxResponse = await axios.get(`https://inboxes.com/api/v2/inbox/${encodedEmail}`);
    return inboxResponse.data.msgs;
  }

  try {
    if (args[0] === 'inbox') {
      if (!args[1]) {
        return chat.reply(mono("Please provide an email address for the inbox."));
      }

      const messages = await checkInbox(args[1]);
      if (!messages || messages.length === 0) {
        return chat.reply(mono(`No messages found for ${args[1]}.`));
      }

      const displayLimit = args[2] || DEFAULT_DISPLAY_LIMIT;
      const limitedMessages = messages.slice(0, displayLimit);
      
      let messageText = '';
      for (const message of limitedMessages) {
        const attachments = message.at.map(attachment => `📎 Attachment: ${attachment.filename} (${attachment.size} bytes)`).join('\n');
        messageText += `👤 𝗦𝗘𝗡𝗗𝗘𝗥: ${message.f}\n🎯 𝗦𝗨𝗕𝗝𝗘𝗖𝗧: ${message.s || 'No Subject 🎯'}\n📅 𝗗𝗔𝗧𝗘: ${message.cr}\n\n${message.ph || 'No Message Content'}\n\n${attachments}\n\n`;
      }

      chat.reply(mono(`Successful! Displaying the latest ${displayLimit} Inbox 📥.\nCheck your message request or spam if you haven't seen the mail yet.`));
      chat.reply(mono(messageText), event.senderID);
      chat.react("📮");
    } else {
      const count = Math.min(args[0] || 1, MAX_EMAIL_COUNT);
      if (count > MAX_EMAIL_COUNT) return chat.reply(`Maximum allowed count is ${MAX_EMAIL_COUNT}.`);

      const domains = await getDomains();
      let generatedEmails = '';
      for (let i = 0; i < count; i++) {
        const email = generateTempEmail(names, domains);
        generatedEmails += `${email.replace(/\./g, '(.)')}\n`;
      }
      chat.reply(generatedEmails);
    }
  } catch (error) {
    chat.reply(mono("Failed to generate or retrieve email, please try again: " + error.message));
  }
};
