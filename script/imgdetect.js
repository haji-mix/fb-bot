const axios = require('axios');


let isMediaUrlDetectorEnabled = false;

module.exports["config"] = {
  name: "media-url-detector",
  aliases: ["imgdetect"],
  role: 0,
  credits: "Kenneth Panio",
  info: "Detect media URLs and send them as attachments. Use `media-detector on` or `media-detector off` to toggle.",
  cd: 5
};

module.exports.run = async ({ chat, event, args }) => {
  const toggle = args[0]?.toLowerCase();

  if (toggle === "on") {
    isMediaUrlDetectorEnabled = true;
    chat.reply("Media URL detector is now enabled.");
  } else if (toggle === "off") {
    isMediaUrlDetectorEnabled = false;
    chat.reply("Media URL detector is now disabled.");
  } else {
    chat.reply("Invalid command. Use `media-detector on` or `media-detector off`.");
  }
};

module.exports.handleEvent = async ({ chat, event, font, global }) => {
  if (!isMediaUrlDetectorEnabled) {
    return;
  }

  const message = event.body?.split(' ')[0];

  const mediaUrlRegex = /^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|bmp|webp|mp4|avi|mov|mkv|wmv|mp3|wav|ogg))(\?.*)?$/i;

  const match = mediaUrlRegex.exec(message);
  if (!match) {
    return;
  }

  const mediaUrl = match[0];
  const extension = mediaUrl.split('.').pop().toLowerCase();

  try {
    if (extension !== 'gif') {
      const response = await axios.get(global.api.kokoro[0] + "/google", {
        params: {
          prompt: "detect",
          model: "gemini-1.5-flash",
          uid: Date.now(),
          roleplay: "As a dedicated NSFW detector, please respond exclusively with a JSON object { \"nsfw\": boolean, \"reason\": \"string\" } indicating whether the content is classified as NSFW (true or false). Additionally, provide clear information within the JSON under the key 'reason,' detailing the specific elements or characteristics that led to this classification.",
          file_url: mediaUrl,
        }
      });

      const output = response.data.message.replace(/```json|```/g, '').trim();

      const nsfwData = JSON.parse(output);
      if (nsfwData.nsfw) {
        chat.reply(font.monospace(`Inappropriate content detected: ${nsfwData.reason}`));
        return;
      }
    }

    chat.reply({ attachment: await chat.arraybuffer(mediaUrl, extension) });

  } catch (error) {
    console.error(`ERROR: ${error.message}`);
  }
};