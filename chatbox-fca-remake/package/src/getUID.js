/* eslint-disable linebreak-style */
"use strict";

const axios = require('axios');
const FormData = require('form-data');
const { URL } = require('url');
const log = require('npmlog');

module.exports = function (defaultFuncs, api, ctx) {
  return function getUID(link, callback) {
    let resolveFunc = () => {};
    let rejectFunc = () => {};
    let returnPromise = new Promise((resolve, reject) => {
      resolveFunc = resolve;
      rejectFunc = reject;
    });

    if (!callback) {
      callback = function (err, uid) {
        if (err) return rejectFunc(err);
        resolveFunc(uid);
      };
    }

    // Decode the user-agent
    const userAgent = atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ==");

    async function getUIDFast(url) {
      try {
        let Form = new FormData();
        let Url = new URL(url);
        Form.append('link', Url.href);

        let { data } = await axios.post('https://id.traodoisub.com/api.php', Form, {
          headers: {
            ...Form.getHeaders(),
            'User-Agent': userAgent
          }
        });

        return data.error ? "Not found" : data.id || "Not found";
      } catch (e) {
        log.error('getUIDFast', e.message);
        return "Not found";
      }
    }

    async function getUIDSlow(url) {
      try {
        let Form = new FormData();
        let Url = new URL(url);
        Form.append('username', Url.pathname.replace(/\//g, ""));

        let { data } = await axios.post('https://api.findids.net/api/get-uid-from-username', Form, {
          headers: {
            'User-Agent': userAgent,
            ...Form.getHeaders()
          }
        });

        return data.status === 200 && data.data?.id ? data.data.id : "Not found";
      } catch (e) {
        log.error('getUIDSlow', e.message);
        return "Not found";
      }
    }

    async function getUID(url) {
      let uid = await getUIDFast(url);
      if (!isNaN(uid)) return uid;

      uid = await getUIDSlow(url);
      if (!isNaN(uid)) return uid;

      log.error('getUID', "Unable to retrieve UID");
      return "Not found";
    }

    try {
      let Link = String(link);
      if (/facebook\.com|fb/i.test(Link)) {
        let LinkSplit = Link.split('/');
        
        if (Link.startsWith("https:")) {
          if (!isNaN(LinkSplit[3]) && !Link.includes('=') || isNaN(Link.split('=')[1])) {
            log.error('getUID', 'Invalid link format.');
            return callback(null, "Not found");
          }

          if (Link.includes('=') && !isNaN(Link.split('=')[1])) {
            let Format = `https://www.facebook.com/profile.php?id=${Link.split('=')[1]}`;
            getUID(Format).then(data => callback(null, data));
          } else {
            getUID(Link).then(data => callback(null, data));
          }
        } else {
          let Form = `https://www.facebook.com/${LinkSplit[1]}`;
          getUID(Form).then(data => callback(null, data));
        }
      } else {
        log.error('getUID', 'Invalid link. Must be a Facebook link.');
        return callback(null, "Not found");
      }
    } catch (e) {
      log.error('getUID', e.message);
      return callback(null, "Not found");
    }

    return returnPromise;
  };
};

// Modified by Kenneth Panio
