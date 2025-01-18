const axios = require('axios');

module.exports["config"] = {
  name: "autotempmail",
  version: "1.0.1",
  isPrefix: false,
  info: "Generates temporary email and auto-fetches messages using TempMail.lol",
  credits: "Kenneth Panio",
  type: "tools",
  role: 0,
  aliases: ['autotemp', 'autogenmail', 'autodumpmail', 'autoinbox', "tempmail", "tempv3", "tempmailv3"],
  usage: "",
  guide: 'autotempmail > Generates an email and auto-fetches messages for 3 minutes or until the email expires.',
  cd: 8
};

const TEMPMAIL_BASE_URL = 'https://api.tempmail.lol/v2';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.79 Mobile Safari/537.36';

module.exports["run"] = async ({ font, chat }) => {
  const mono = txt => font.monospace(txt);

  async function createTempEmail() {
    try {
      const response = await axios.post(
        `${TEMPMAIL_BASE_URL}/inbox/create`,
        { domain: null },
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': USER_AGENT,
            Referer: 'https://tempmail.lol/en/',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error("Failed to generate a temporary email: " + error.message);
    }
  }

  async function checkInbox(token) {
    try {
      const response = await axios.get(`${TEMPMAIL_BASE_URL}/inbox?token=${token}`, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://tempmail.lol/en/',
        },
      });
      return response.data.emails || [];
    } catch (error) {
      throw new Error("Failed to check inbox: " + error.message);
    }
  }

  try {
    chat.reply(mono('Generating temporary email...'));

    const { address, token } = await createTempEmail();
    chat.reply(`Temporary Email:\n\n${address}\n\nAuto-fetching messages for 3 minutes until the email expires...`);

    const stopTime = Date.now() + 3 * 60 * 1000;
    let recheckCount = 0;

    const intervalId = setInterval(async () => {
      if (Date.now() >= stopTime) {
        clearInterval(intervalId);
        chat.reply(mono('Stopped auto-fetching messages. The email has expired.'));
        return;
      }

      try {
        const inbox = await checkInbox(token);
        recheckCount++;
        if (inbox && inbox.length > 0) {
          let messages = font.bold(`📥 New Messages in Inbox (Recheck #${recheckCount})\n\n`);
          inbox.forEach((message, index) => {
            const date = new Date(message.date).toLocaleString();
            messages += `📧 𝗠𝗲𝘀𝘀𝗮𝗴𝗲 ${index + 1}:\n`;
            messages += `🖋️ 𝗙𝗿𝗼𝗺: ${message.from}\n`;
            messages += `📨 𝗧𝗼: ${message.to}\n`;
            messages += `📜 𝗦𝘂𝗯𝗷𝗲𝗰𝘁: ${message.subject || '[No Subject]'}\n`;
            messages += `📅 𝗥𝗲𝗰𝗲𝗶𝘃𝗲𝗱: ${date}\n`;
            messages += `📄 𝗕𝗼𝗱𝘆:\n${message.body || '[No Content]'}\n\n`;
          });
          chat.reply(messages);
        } else {
          chat.reply(mono(`No new messages. Re-checking inbox... (#${recheckCount})`));
        }
      } catch (error) {
        chat.reply(mono('Error while fetching messages: ' + error.message));
      }
    }, 30000);
  } catch (error) {
    chat.reply(mono(error.message));
  }
};
