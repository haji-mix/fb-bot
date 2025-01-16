"use strict";

const axios = require("axios");
const log = require("npmlog");
const cheerio = require("cheerio");
const utils = require("../utils");

//@Kenneth Panio
function formatProfileData(data, userID) {
  if (!data.name) {
    return {
      name: null,
      userid: null,
      profile_img: null,
      profile_url: null,
    };
  }

  return {
    name: data.name,
    userid: userID,
    profile_img: `https://graph.facebook.com/${userID}/picture?width=1500&height=1500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`,
    profile_url: `https://facebook.com/${userID}`,
  };
}

function fetchProfileData(userID, callback) {
  axios
    .get(`https://www.facebook.com/profile.php?id=${userID}`, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Referer": "https://www.facebook.com/",
        "User-Agent": utils.generateUserAgent(),
        "Connection": "keep-alive",
        "Host": "www.facebook.com",
        "Origin": "https://www.facebook.com",
        "sec-fetch-site": "same-origin",
        "Sec-Fetch-User": "?1",
      },
    })
    .then((response) => {
      const $ = cheerio.load(response.data);

      let name =
        $('meta[property="og:title"]').attr("content") ||
        $('meta[name="title"]').attr("content") ||
        null;

      if (!name) {
        const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
        name = titleMatch ? titleMatch[1].trim() : null;
      }

      if (!name) {
        log.warn("fetchProfileData", "Failed to extract name for userID:", userID);
      }

      const profileData = formatProfileData({ name }, userID);
      callback(null, profileData);
    })
    .catch((err) => {
      log.error("fetchProfileData", "Error fetching profile data:", err.message);
      callback(err, formatProfileData({ name: null }, userID));
    });
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
};
