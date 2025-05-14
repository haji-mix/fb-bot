const axios = require('axios');

global.hajime = global.hajime || { replies: {} };


module.exports.config = {
  name: 'gpt4o',
  isPrefix: false,
  aliases: ['gpt', 'gpt4', 'ai'],
  version: '1.0.0',
  credits: 'Kenneth Panio | Liane Cagara',
  role: 0,
  type: 'artificial-intelligence',
  info: 'Interact with the GPT4o AI.',
  usage: '[prompt]',
  guide: 'gpt4o hello?',
  cd: 6,
};

module.exports.run = ({ args, chat, font, event, format }) => {
  const uid = event.senderID;
  let ask = args.join(' ').trim();

  if (event.type === 'message_reply') {
    if (event.messageReply.body) ask += `\n\nReplied: ${event.messageReply.body}`;
    if (event.messageReply.attachments) {
      ask += `\n\nAttachments: ${event.messageReply.attachments.map(a => a.url).join(', ')}`;
    }
  }

  if (!ask) return chat.reply(font.thin('Provide a message!'));

  chat.reply(font.thin('Generating...'), (err, answering) => {
    if (err) return console.error('Error sending:', err);

    axios.get(`${global.api.hajime}/api/gpt4o?ask=${encodeURIComponent(ask)}&uid=${uid}`)
      .then(({ data }) => {
        chat.unsend(answering.messageID);

        const sendResponse = (body, attachment, callback) => {
          chat.reply({ body, attachment }, (err, info) => {
            if (err) return console.error('Error replying:', err);
            setupReplyHandler(info, uid, ask, data, sendResponse);
            callback?.();
          });
        };

        if (data.images?.length) {
          const desc = data.images.map((img, i) => `${i + 1}. ${img.description}`).join('\n\n');
          Promise.all(data.images.map(img => chat.arraybuffer(img.url)))
            .then(attachments => sendResponse(desc, attachments))
            .catch(err => chat.reply(font.thin('Error fetching images.')));
          return;
        }

        sendResponse(format({ title: 'GPT-4O', content: data.answer, noFormat: true, contentFont: 'none' }));
      })
      .catch(err => {
        chat.unsend(answering.messageID);
        chat.reply(font.thin(err.message));
      });
  });
};

const setupReplyHandler = (info, uid, query, response, sendResponse) => {
  global.hajime.replies = global.hajime.replies || {};
  global.hajime.replies[info.messageID] = {
    author: uid,
    conversationHistory: [{ user: query, bot: response.answer || response.images }],
    callback: ({ chat, font, event, data }) => {
      const reply = event.body?.trim();
      if (!reply) return chat.reply(font.thin('Provide a reply!'), event.messageID);

      chat.reply(font.thin('Generating...'), (err, answering) => {
        if (err) return console.error('Error sending:', err);

        axios.get(`${global.api.hajime}/api/gpt4o?ask=${encodeURIComponent(reply)}&uid=${uid}`)
          .then(({ data }) => {
            chat.unsend(answering.messageID);
            data.conversationHistory = data.conversationHistory.push({ user: reply, bot: data.answer || data.images });

            if (data.images?.length) {
              const desc = data.images.map((img, i) => `${i + 1}. ${img.description}`).join('\n\n');
              Promise.all(data.images.map(img => chat.arraybuffer(img.url)))
                .then(attachments => sendResponse(desc, attachments, () => delete global.hajime.replies[info.messageID]))
                .catch(() => chat.reply(font.thin('Error fetching images.'), event.messageID));
              return;
            }

            sendResponse(format({ title: 'GPT-4O', content: data.answer, noFormat: true, contentFont: 'none' }), null, () => delete global.hajime.replies[info.messageID]);
          })
          .catch(err => {
            chat.unsend(answering.messageID);
            chat.reply(font.thin('Error processing reply.'), event.messageID);
            delete global.hajime.replies[info.messageID];
          });
      });
    },
  };

  setTimeout(() => delete global.hajime.replies[info.messageID], 300000);
};