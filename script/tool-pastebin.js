module.exports["config"] = {
  name: "adc",
  aliases: ["pastebin", "pistabin"],
  usage: ["[cmd filename]", "[reply to pastebin raw link with name]"],
  info: "paste cmd code to pastebin raw",
  guide: "adc [command name] it will upload your command to pastebin or reply to specific pastebin link with adc with command name to install",
  usage: "[command name] or reply with [command name] to pastebin link for install",
  type: "Tools",
  version: "1.1.0",
  prefix: 0,
  role: 3,
};

module.exports["run"] = async function ({ chat, event, args, font }) {
  const axios = require('axios');
  const fs = require('fs');
  const request = require('request');
  const cheerio = require('cheerio');
  const path = require('path');
  const { messageReply, type } = event;
  var name = args[0];

  if (type == "message_reply") {
    var text = messageReply.body;
  }

  if (!text && !name) return chat.reply(font.monospace('Please reply to the link you want to apply the code to or write the file name to upload the code to pastebin!'));

  const filePath = [
    path.join(__dirname, `${args[0]}.js`),
    path.join(__dirname, `${args[0]}.ts`),
    path.join(__dirname, 'event', `${args[0]}.js`),
    path.join(__dirname, 'event', `${args[0]}.ts`)
  ].find(file => fs.existsSync(file));

  if (!text && name) {
    if (!filePath) return chat.reply(font.monospace(`Command ${args[0]} does not exist!`));

    fs.readFile(filePath, "utf-8", async (err, data) => {
      if (err) return chat.reply(font.monospace(`Error reading the file ${args[0]}`));
      
      const { PasteClient } = require('pastebin-api');
      const client = new PasteClient("R02n6-lNPJqKQCd5VtL4bKPjuK6ARhHb");

      async function pastepin(name) {
        const url = await client.createPaste({
          code: data,
          expireDate: 'N',
          format: "javascript",
          name: name,
          publicity: 1
        });
        var id = url.split('/')[3];
        return 'https://pastebin.com/raw/' + id;
      }

      var link = await pastepin(args[1] || 'noname');
      return chat.reply(link);
    });
    return;
  }

  var urlR = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
  var url = text.match(urlR);

  if (url && url[0]?.includes('pastebin')) {
    axios.get(url[0]).then(i => {
      var data = i.data;
      fs.writeFile(
        path.join(__dirname, `${args[0]}.js`),
        data,
        "utf-8",
        function (err) {
          if (err) return chat.reply(font.monospace(`An error occurred while applying the code ${args[0]}.js`));
          chat.reply(font.monospace(`Applied the code to ${args[0]}.js, use command load to use!`));
        }
      );
    });
  } else if (url && (url[0]?.includes('buildtool') || url[0]?.includes('tinyurl.com'))) {
    const options = {
      method: 'GET',
      url: messageReply.body
    };
    request(options, function (error, response, body) {
      if (error) return chat.reply(font.monospace('Please only reply to the link (doesn\'t contain anything other than the link)'));
      const load = cheerio.load(body);
      load('.language-js').each((index, el) => {
        if (index !== 0) return;
        var code = el.children[0].data;
        fs.writeFile(
          path.join(__dirname, `${args[0]}.js`),
          code,
          "utf-8",
          function (err) {
            if (err) return chat.reply(font.monospace(`An error occurred while applying the new code to "${args[0]}.js".`));
            return chat.reply(font.monospace(`Added this code "${args[0]}.js", use command load to use!`));
          }
        );
      });
    });
    return;
  }
}
