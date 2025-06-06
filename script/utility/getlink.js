const axios = require("axios");

module.exports["config"] = {
  name: "getlink",
  isPrefix: false,
  version: "1.0.0",
  role: 0,
  type: "utility",
  credits: "Kenneth Panio",
  info: "Get the HD link of a Facebook video or attachment you replied with",
  usage: "[fb reels video url] or reply to attachment",
  guide: "Provide a Facebook post video URL or reply to a message with an attachment",
  cd: 0,
};

module.exports["run"] = async ({ chat, event, args, font }) => {
  try {
    if (args.length > 0) {
      const videoUrl = args[0];
      const videoDetails = await fetchVideoDetails(videoUrl);

      let replyMessage = `Title: ${videoDetails.title || "Unknown or No Title"}\n`;
      if (videoDetails.hd) {
        replyMessage += `HD Link: ${await chat.tinyurl(videoDetails.hd)}\n`;
      }
      if (videoDetails.sd) {
        replyMessage += `SD Link: ${await chat.tinyurl(videoDetails.sd)}\n`;
      }
      chat.reply(replyMessage);
    } else if (event.messageReply && event.messageReply.attachments && event.messageReply.attachments.length > 0) {
      const attachments = event.messageReply.attachments;
      const attachmentLinks = attachments.map(attachment => attachment.url);

      chat.reply(attachmentLinks.join('\n\n'));
    } else {
      chat.reply(font.monospace('Please provide a reels url or reply to a message with an attachment.'));
    }
  } catch (error) {
    return chat.reply(font.monospace(error.stack || error.message || "Failed to getlink."));
  }
};

async function fetchVideoDetails(url) {
  const validFacebookVideoUrlRegex = /https:\/\/www\.facebook\.com\/(?:watch\/?\?v=\d+|(?:\S+\/videos\/\d+)|(?:reel\/\d+)|(?:share\/\S+))(?:\?\S+)?/;

  if (!validFacebookVideoUrlRegex.test(url)) {
    throw new Error("Please provide a valid Facebook video URL");
  }

  const bytes = String.fromCharCode(...[
    115, 98, 61, 82, 110, 56, 66, 89, 81, 118, 67, 69, 98, 50, 102, 112,
    77, 81, 90, 106, 115, 100, 54, 76, 51, 56, 50, 59, 32, 100, 97, 116,
    114, 61, 82, 110, 56, 66, 89, 98, 121, 104, 88, 103, 119, 57, 82, 108,
    79, 118, 109, 115, 111, 115, 109, 86, 78, 84, 59, 32, 99, 95, 117, 115,
    101, 114, 61, 49, 48, 48, 48, 48, 51, 49, 54, 52, 54, 51, 48, 54, 50,
    57, 59, 32, 95, 102, 98, 112, 61, 102, 98, 46, 49, 46, 49, 54, 50, 57,
    56, 55, 54, 49, 50, 54, 57, 57, 55, 46, 52, 52, 52, 54, 57, 57, 55, 51,
    57, 59, 32, 119, 100, 61, 49, 57, 50, 48, 120, 57, 51, 57, 59, 32, 115,
    112, 105, 110, 61, 114, 46, 49, 48, 48, 52, 56, 49, 50, 53, 48, 53, 95,
    98, 46, 116, 114, 117, 110, 107, 95, 116, 46, 49, 54, 51, 56, 55, 51,
    48, 51, 57, 51, 95, 115, 46, 49, 95, 118, 46, 50, 95, 59, 32, 120, 115,
    61, 50, 56, 37, 51, 65, 56, 82, 79, 110, 80, 48, 97, 101, 86, 70, 56,
    88, 99, 81, 37, 51, 65, 50, 37, 51, 65, 49, 54, 50, 55, 52, 56, 56, 49,
    52, 53, 37, 51, 65, 45, 49, 37, 51, 65, 52, 57, 49, 54, 37, 51, 65, 37,
    51, 65, 65, 99, 87, 73, 117, 83, 106, 80, 121, 50, 109, 108, 84, 80, 117,
    90, 65, 101, 65, 50, 119, 87, 122, 72, 122, 69, 68, 117, 117, 109, 88, 73,
    56, 57, 106, 72, 56, 97, 95, 81, 73, 86, 56, 59, 32, 102, 114, 61, 48,
    106, 81, 119, 55, 104, 99, 114, 70, 100, 97, 115, 50, 90, 101, 121, 84,
    46, 65, 87, 86, 112, 82, 78, 108, 95, 52, 110, 111, 67, 69, 115, 95, 104,
    98, 56, 107, 97, 90, 97, 104, 115, 45, 106, 65, 46, 66, 104, 114, 81, 113,
    97, 46, 51, 69, 46, 65, 65, 65, 46, 48, 46, 48, 46, 66, 104, 114, 81, 113,
    97, 46, 65, 87, 85, 117, 56, 55, 57, 90, 116, 67, 119
  ]);

  const headers = {
    "sec-fetch-user": "?1",
    "sec-ch-ua-mobile": "?0",
    "sec-fetch-site": "none",
    "sec-fetch-dest": "document",
    "sec-fetch-mode": "navigate",
    "cache-control": "max-age=0",
    authority: "www.facebook.com",
    "upgrade-insecure-requests": "1",
    "accept-language": "en-GB,en;q=0.9,tr-TR;q=0.8,tr;q=0.7,en-US;q=0.6",
    "sec-ch-ua": '"Google Chrome";v="89", "Chromium";v="89", ";Not A Brand";v="99"',
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
    cookie: bytes,
  };

  const parseString = (string) => JSON.parse(`{"text": "${string}"}`).text;

  return new Promise((resolve, reject) => {
    axios.get(url, { headers }).then(({ data }) => {
      data = data.replace(/&quot;/g, '"').replace(/&amp;/g, "&");

      const sdMatch = data.match(/"browser_native_sd_url":"(.*?)"/) || data.match(/"playable_url":"(.*?)"/) || data.match(/sd_src\s*:\s*"([^"]*)"/) || data.match(/(?<="src":")[^"]*(https:\/\/[^"]*)/);
      const hdMatch = data.match(/"browser_native_hd_url":"(.*?)"/) || data.match(/"playable_url_quality_hd":"(.*?)"/) || data.match(/hd_src\s*:\s*"([^"]*)"/);
      const titleMatch = data.match(/<meta\sname="description"\scontent="(.*?)"/);
      const thumbMatch = data.match(/"preferred_thumbnail":{"image":{"uri":"(.*?)"/);

      if (sdMatch && sdMatch[1]) {
        const result = {
          title: titleMatch && titleMatch[1] ? parseString(titleMatch[1]) : data.match(/<title>(.*?)<\/title>/)?.[1] ?? "",
          sd: parseString(sdMatch[1]),
          hd: hdMatch && hdMatch[1] ? parseString(hdMatch[1]) : "",
          thumbnail: thumbMatch && thumbMatch[1] ? parseString(thumbMatch[1]) : "",
        };

        resolve(result);
      } else {
        reject("Unable to fetch video information at this time. Please try again");
      }
    }).catch(error => {
      reject("Unable to fetch video information at this time. Please try again");
    });
  });
}