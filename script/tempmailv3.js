const axios = require('axios');

module.exports["config"] = {
  name: "autotempmail",
  version: "1.0.1",
  isPrefix: false,
  info: "Generates temporary email and auto-fetches messages using TempMail.lol",
  credits: "Kenneth Panio",
  type: "tools",
  role: 0,
  aliases: ['autotemp', 'autogenmail', 'autodumpmail', 'autoinbox', "tempmail", "tempv3", "tempmailv3", "temp"],
  usage: "",
  guide: 'autotempmail > Generates an email and auto-fetches messages for 3 minutes or until the email expires.',
  cd: 8
};

const TEMPMAIL_BASE_URL = 'https://api.tempmail.lol/v2';
const USER_AGENT =
  'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.79 Mobile Safari/537.36';

module.exports["run"] = async ({ font, chat }) => {
  const mono = txt => font.monospace(txt);

  const gen_msg = await chat.reply(mono('Generating temporary email...'));

  const createTempEmail = async () => {
    try {
      const { data } = await axios.post(
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
      return data;
    } catch (error) {
      throw new Error("Failed to generate a temporary email: " + error.message);
    }
  };

  const checkInbox = async (token) => {
    try {
      const { data } = await axios.get(`${TEMPMAIL_BASE_URL}/inbox?token=${token}`, {
        headers: {
          'User-Agent': USER_AGENT,
          Referer: 'https://tempmail.lol/en/',
        },
      });
      return data.emails || [];
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error("Inbox expired or token is invalid.");
      }
      throw new Error("Failed to check inbox: " + error.message);
    }
  };

  let errorReported = false;

  try {
    const { address, token } = await createTempEmail();
    const fetch_msg = await chat.reply(`Temporary Email:\n\n${address}\n\nAuto-fetching messages for 5 minutes until the email expires...`);
    gen_msg.unsend();

    const stopTime = Date.now() + 5 * 60 * 1000;
    let lastMessageCount = 0;

    const intervalId = setInterval(async () => {
      if (Date.now() >= stopTime) {
        clearInterval(intervalId);
        chat.reply(mono(`The temporary email ${address} has expired.`));
        return fetch_msg.unsend();
      }

      try {
        const inbox = await checkInbox(token);
        if (inbox.length > lastMessageCount) {
          lastMessageCount = inbox.length;
          let messages = font.bold(`📥 TEMPMAIL INBOX:\n\n`);
          inbox.forEach(({ from, to, subject, date, body }, index) => {
            messages += `🖋️ From: ${from}\n📨 To: ${to}\n📜 Subject: ${subject || '[No Subject]'}\n📅 Date: ${new Date(date).toLocaleString()}\n📄 Message:\n${body || '[No Content]'}\n\n`;
          });
          chat.reply(messages);
          fetch_msg.unsend();
        }
      } catch (error) {
        if (!errorReported) {
          fetch_msg.unsend();
          chat.reply(mono('Error while fetching messages: ' + error.message));
          errorReported = true;
        }
      }
    }, 1000);
  } catch (error) {
    gen_msg.unsend();
    chat.reply(mono(error.message));
  }
};
