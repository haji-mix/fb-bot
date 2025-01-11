"use strict";

const axios = require('axios');
const utils = require('../utils');
const log = require("npmlog");

//@Kenneth Panio

function formatProfileData(data, userID) {
  const profileData = {
    name: data.name || 'ANONYMOUS',
    userid: userID,
    profile_img: `https://graph.facebook.com/${userID}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    profile_url: `https://facebook.com/${userID}`,
  };
  return profileData;
}

module.exports = (defaultFuncs, api, ctx) => {
  return function getInfo(id, callback) {
    const userID = id || ctx.userID;
    
    if (!callback) {
      return new Promise((resolve, reject) => {
        const finalCallback = (err, profileData) => {
          if (err) {
            return reject(err);
          }
          resolve(profileData);
        };
        fetchProfileData(userID, finalCallback);
      });
    } else {
      fetchProfileData(userID, callback);
    }
  };

  function fetchProfileData(userID, callback) {
    axios.get(`https://www.facebook.com/profile.php?id=${userID}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.facebook.com/",
        'User-Agent': utils.generateUserAgent() || 'Mozilla/5.0',
        'Connection': "keep-alive",
        'Host': 'www.facebook.com',
        'Origin': 'https://www.facebook.com',
        "sec-fetch-site": "same-origin",
        'Sec-Fetch-User': '?1'
      }
    })
    .then(response => {
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
      const profileData = formatProfileData({ name: titleMatch ? titleMatch[1].trim() : 'ANONYMOUS' }, userID);
      callback(null, profileData);
    })
    .catch(err => {
      log.error("getInfo", `Error fetching data for user ${userID}: ${err.message}`);
      callback(err);
    });
  }
};
