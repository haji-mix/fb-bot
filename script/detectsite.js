const axios = require('axios');

let screenshotEnabled = false;

module.exports["config"] = {
  name: "autoss",
  role: 1,
  info: "Auto Detect a website URL and take a screenshot",
  version: "1.0.0",
  usage: "[on/off]",
};

module.exports["handleEvent"] = async ({ chat, event, font }) => {
  try {
    if (event.body && screenshotEnabled) {
      const link = event.body?.split(' ')[0]?.trim();
      const isValidLink = link && (link.startsWith('http://') || link.startsWith('https://'));

      const excludedExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|tiff|svg|mp3|mp4|wav|ogg|webm)(\?.*)?$/i;
      const excludedDomains = /(facebook\.com|fb\.com|pixiv\.net|tiktok\.com)/i;

      if (!isValidLink || excludedExtensions.test(link) || excludedDomains.test(link)) {
        return;
      }

      const encodedLink = encodeURIComponent(link);
      const screenshotUrl = `https://image.thum.io/get/width/1920/crop/400/fullpage/noanimate/${encodedLink}`;
      const attachment = await chat.stream(screenshotUrl);

      await chat.reply({ attachment });
    }
  } catch (error) {
    console.error("Error processing the screenshot:", error);
  }
};

module.exports["run"] = async function ({ chat, args }) {
  const command = args.join(" ").trim().toLowerCase();
  if (command === "on") {
    screenshotEnabled = true;
    chat.reply("Auto Screenshot functionality is now enabled.");
  } else if (command === "off") {
    screenshotEnabled = false;
    chat.reply("Auto Screenshot functionality is now disabled.");
  } else {
    chat.reply("Use 'on' to enable or 'off' to disable Auto screenshot functionality.");
  }
};
