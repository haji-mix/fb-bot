"use strict";

const axios = require("axios");
const { wrapper } = require("axios-cookiejar-support");
const tough = require("tough-cookie");
const log = require("npmlog");
const utils = require("../utils");

// Create a cookie jar to manage cookies
const jar = new tough.CookieJar();
const axiosInstance = wrapper(
  axios.create({
    withCredentials: true,
    jar,
  })
);

// Format profile data
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

// Fetch profile data using Axios and Cookie Management
function fetchProfileData(userID, callback) {
  axiosInstance
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
      maxRedirects: 5, // Follow up to 5 redirects
      validateStatus: (status) => status < 400, // Accepts redirects as valid
    })
    .then((response) => {
      // Check for redirection or login pages
      const currentURL = response.request.res.responseUrl;
      if (currentURL.includes("login") || currentURL.includes("error")) {
        log.warn(
          "fetchProfileData",
          `Redirected to login or error page for userID: ${userID}`
        );
        callback(null, formatProfileData({ name: "Redirect Detected" }, userID));
        return;
      }

      // Extract profile name from the page's meta or title
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/);
      const name = titleMatch ? titleMatch[1].trim() : null;

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
