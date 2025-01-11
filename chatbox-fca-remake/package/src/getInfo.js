const axios = require('axios');
const utils = require('../utils');
const log = require("npmlog");

// @Kenneth Panio

module.exports = (defaultFuncs, api, ctx) => {
  return function getInfo(id, callback) {
    const userID = id || ctx.userID;
    
    axios.get(`https://www.facebook.com/profile.php?id=${userID}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.facebook.com/",
        'User-Agent': utils.generateUserAgent(),
        'Connection': "keep-alive",
        'Host': 'www.facebook.com',
        'Origin': 'https://www.facebook.com',
        "sec-fetch-site": "same-origin",
        'Sec-Fetch-User': '?1'
      }
    })
    .then(response => {
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/);

      let profileData = {};

      if (titleMatch && titleMatch[1]) {
        profileData.name = titleMatch[1].trim();
        profileData.userid = userID;
        profileData.profile_img = `https://graph.facebook.com/${userID}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        profileData.profile_url = `https://facebook.com/${userID}`;
      } else {
        profileData.name = 'ANONYMOUS';
        profileData.userid = userID;
        profileData.profile_img = `https://graph.facebook.com/${userID}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        profileData.profile_url = `https://facebook.com/${userID}`;
      }

      callback(null, profileData);
    })
    .catch(err => {
      log.error("getInfo", err)
      callback(err);
    });
  };
};
