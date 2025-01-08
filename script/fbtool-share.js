const axios = require('axios');
const randomUserAgent = require('random-useragent');

module.exports["config"] = {
  name: "fbshare",
  isPrivate: true,
  aliases: ["share", "sharehandle", "shareboost", "spamshare"],
  version: "2.0.1",
  role: 3,
  credits: "Reiko Dev",
  info: "boosting shares on Facebook Post!",
  type: "fbtool",
  usage: "[token] [link] [amount] [interval (optional)]",
  cd: 16,
};

module.exports["run"] = async function ({ api, event, args, chat, global }) {
  try {
    if (args.length < 3 || args.length > 4) {
      chat.reply('Invalid number of arguments. Usage: !fbshare [token] [link] [amount] [interval (optional)]');
      return;
    }

    const shareUrl = args[1];
    const accessToken = args[0];
    const shareAmount = parseInt(args[2]);
    const customInterval = args[3] ? parseInt(args[3]) : 1;

    if (isNaN(shareAmount) || shareAmount <= 0 || (args[3] && isNaN(customInterval)) || (args[3] && customInterval <= 0)) {
      chat.reply('Invalid share amount or interval. Please provide valid positive numbers.');
      return;
    }

    const timeInterval = customInterval * 1000;
    const deleteAfter = 60 * 60;
    let sharedCount = 0;
    let timer = null;
    let errorHandled = false;

    async function sharePost(postUrl) {
      try {
        const postResponse = await axios.post(
          `https://graph.facebook.com/me/feed?access_token=${accessToken}&fields=id&limit=1&published=0`,
          {
            link: postUrl,
            privacy: { value: 'SELF' },
            no_story: true,
          },
          {
            muteHttpExceptions: true,
            headers: {
              authority: 'graph.facebook.com',
              'cache-control': 'max-age=0',
              'sec-ch-ua-mobile': '?0',
              'user-agent': randomUserAgent.getRandom(),
            },
            method: 'post',
          }
        );

        sharedCount++;

        const postId = postResponse?.data?.id;

        chat.log(`Post shared: ${sharedCount}`);
        chat.log(`Post ID: ${postId || 'Unknown'}`);

        if (sharedCount === shareAmount) {
          clearInterval(timer);

          setTimeout(() => {
            deletePost(postId);
          }, deleteAfter * 1000);

          chat.reply(`Successfully shared and stopped! in ${sharedCount} times.`);
        }
      } catch (error) {
        console.error(error);

        if (!errorHandled) {
          if (error.response && error.response.data && error.response.data.error) {
            chat.reply(`Stopped Sharing!: ${error.response.data.error.message}`);
          } else {
            chat.reply(error.message || "Something Went Wrong!");
          }

          clearInterval(timer);
          errorHandled = true;
        }
      }
    }

    async function deletePost(postId) {
      try {
        await axios.delete(`https://graph.facebook.com/${postId}?access_token=${accessToken}`);
        chat.log(`Post deleted: ${postId}`);
      } catch (error) {
        console.error('Failed to delete post:' + error.message.response.data);
      }
    }

    timer = setInterval(() => sharePost(shareUrl), timeInterval);

    setTimeout(() => {
      clearInterval(timer);
      chat.log('Stopped!');
    }, (shareAmount + 1) * timeInterval);
  } catch (error) {
    chat.reply(error.message);
    return;
  }
};
