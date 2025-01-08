const axios = require('axios');
const uuidv4 = require('uuid').v4;
const {
    generateUserAgent
} = require('../system/useragent.js');
const crypto = require('crypto');

module.exports["config"] = {
  name: 'token',
  aliases: ["fbtoken"],
  version: '1.0.1',
  credits: 'Kenneth Panio',
  isPrivate: true,
  role: 0,
  type: 'grabber',
  info: 'grab facebook cookies and token',
  usage: '[email/uid] [password] [optional: 2fa_code]',
  guide: 'login johnjoe@gmail.com @atomic0\nlogin 647282622728 @atomic0',
  cd: 10,
};

module.exports["run"] = async ({ chat, args, font, prefix, global, event }) => {
  var mono = txt => font.monospace(txt);
  var { line } = global.design;
  const username = args[0];
  const password = args[1];
  let _2fa = args[2]; 
  
  if (!username || !password) {
    chat.reply(mono(`How to login?\n\nexample: ${prefix}token [email/uid] [password] [optional: 2fa code]`));
    return;
  }

  try {
    const tokenData = await retrieveToken(username, password, _2fa, global);
    if (tokenData) {
      const { access_token_eaad6v7, access_token, page_token, cookies, c_cookies } = tokenData;
 
      let pageTokenMessage = '';
      if (page_token) {
        pageTokenMessage = font.bold(`EXTRACTED TOKEN`) + `\n${page_token.map((page, index) => font.bold(`${line}\n${index + 1}. ${page.name}`) + `\n${line}\n${page.access_token}`).join('\n')}`;
      } else {
        pageTokenMessage = access_token;
      }
      await chat.reply(access_token_eaad6v7);
      await chat.reply(JSON.stringify(cookies));
      await chat.reply(c_cookies);
       chat.reply(pageTokenMessage);
      chat.delthread(event.threadID);
    }
  } catch (error) {
    chat.reply(mono(error.message));
  }
};

async function retrieveToken(username, password, _2fa, global) {
  const rdev = uuidv4();
  const form = {
          adid: rdev,
          email: username,
          password: password,
          format: 'json',
          device_id: rdev,
          cpl: 'true',
          family_device_id: rdev,
          locale: 'en_US',
          error_detail_type: 'button_with_disabled',
          client_country_code: 'US',
          credentials_type: 'device_based_login_password',
          generate_session_cookies: '1',
          generate_analytics_claim: '1',
          generate_machine_id: '1',
          currently_logged_in_userid: '0',
          advertiser_id: rdev,
          irisSeqID: 1,
          try_num: "1",
          enroll_misauth: "false",
          meta_inf_fbmeta: "NO_FILE",
          source: 'device_based_login',
          machine_id: randomString(24),
          method: 'auth.login',
          meta_inf_fbmeta: '',
          fb_api_req_friendly_name: 'authenticate',
          fb_api_caller_class: 'com.facebook.account.login.protocol.Fb4aAuthHandler',
          api_key: '62f8ce9f74b12f84c123cc23437a4a32',
          access_token: '350685531728%7C62f8ce9f74b12f84c123cc23437a4a32'
  };

  if (_2fa) {
    form.twofactor_code = _2fa;
  }

  form.sig = encodesig(sort(form));

  const options = {
    url: "https://b-api.facebook.com/method/auth.login",
    method: 'post',
    data: form,
    transformRequest: [(data) => {
      return require('querystring').stringify(data);
    }],
    headers: {
            'content-type': 'application/x-www-form-urlencoded',
          "x-fb-friendly-name": form["fb_api_req_friendly_name"],
                  'x-fb-http-engine': 'Liger',
                  'user-agent': generateUserAgent(),
                  'Host': 'graph.facebook.com',
                  'X-FB-Connection-Type': 'MOBILE.LTE',
                  'X-Tigon-Is-Retry': 'False',
                  'x-fb-session-id': 'nid=jiZ+yNNBgbwC;pid=Main;tid=132;nc=1;fc=0;bc=0;cid=62f8ce9f74b12f84c123cc23437a4a32',
                  'X-FB-Request-Analytics-Tags': 'graphservice',
                  'X-FB-Client-IP': 'True',
                  'X-FB-Server-Cluster': 'True',
                  'x-fb-connection-token': '62f8ce9f74b12f84c123cc23437a4a32'
          }
  };

  try {
    const response = await axios.request(options);
    const token = await convertToken(response.data.access_token, global);
    const session = response.data.session_cookies;
    
    const cookies = session.map(cookie => ({
      key: cookie.name,
      value: cookie.value,
      domain: cookie.domain,
      path: cookie.path || '/',
      hostOnly: cookie.domain.startsWith('.'),
      creation: new Date().toISOString(),
      lastAccessed: new Date().toISOString(),
      author: "Made with ♥️ by Kenneth Panio"
    }));
    
    const c_cookies = await convertCookie(session);
    
    const config = {
      headers: {
        Authorization: `Bearer ${token || response.data.access_token}`,
      },
      scope: [
        'public_profile', 'email', 'user_friends', 'user_likes', 'user_photos', 'user_videos', 'user_status', 'user_posts', 'user_tagged_places', 'user_hometown', 'user_location', 'user_work_history', 'user_education_history', 'user_groups', 'publish_pages', 'manage_pages', 'pages_messaging', 'pages_manage_engagement', 'pages_manage_metadata', 'pages_manage_posts', 'pages_manage_ads', 'pages_show_list', 'pages_read_engagement', 'pages_manage_instant_articles', 'pages_messaging_subscriptions', 'pages_messaging_payments', 'messages', 'messaging_options', 'message_edits', 'message_reactions', 'message_reads', 'messaging_customer_information', 'messaging_feedback', 'group_feed', 'message_deliveries', 'messaging_payments', 'messaging_checkout_updates', 'messaging_referrals', 'standby', 'messaging_policy_enforcement', 'inbox_labels', 'send_cart', 'messaging_postbacks', 'messaging_optouts', 'message_reads', 'messaging_pre_checkouts', 'messsaging_account_linking','messaging_account_linking', 'message_echoes', 'messaging_game_plays', 'messaging_handovers'
      ],
    };

    const { data } = await axios.get("https://graph.facebook.com/v18.0/me/accounts", config);
    const pagesData = data.data.map(({ id, access_token, name }) => ({ id, name, access_token }));
    const page_token = pagesData.length > 0 ? pagesData : null;

    return { access_token_eaad6v7: token, access_token: response.data.access_token, cookies, c_cookies, page_token };
  } catch (error) {
    throw new Error("Failed to extract appstate and token for some security reasons. Try double-checking email/uid and password. If it still doesn't work, try changing your password or using fresh accounts.");
  }
}

async function convertCookie(session) {
  let cookie = "";
  for (let i = 0; i < session.length; i++) {
    cookie += `${session[i].name}=${session[i].value}; `;
  }
  return cookie;
}

async function convertToken(token, global) {
  try {
    const response = await axios.get(`https://api.facebook.com/method/auth.getSessionforApp?format=json&access_token=${token}&new_app_id=275254692598279`);
    if (response.data.error) {
      return null;
    } else {
      return response.data.access_token;
    }
  } catch (error) {
    throw new Error("Unavailable due to restriction or prevented from using this feature.");
  }
}

function randomString(length) {
  length = length || 10;
  let char = 'abcdefghijklmnopqrstuvwxyz';
  char = char.charAt(Math.floor(Math.random() * char.length));
  for (let i = 0; i < length - 1; i++) {
    char += 'abcdefghijklmnopqrstuvwxyz0123456789'.charAt(Math.floor(36 * Math.random()));
  }
  return char;
}

function encodesig(string) {
  let data = '';
  Object.keys(string).forEach(function(info) {
    data += info + '=' + string[info];
  });
  data = crypto.createHash('md5').update(data + '62f8ce9f74b12f84c123cc23437a4a32').digest('hex');
  return data;
}

function sort(string) {
  const sor = Object.keys(string).sort();
  let data = {};
  for (const i in sor) {
    data[sor[i]] = string[sor[i]];
  }
  return data;
}

//EAAClA:   181425161904154|95a15d22a0e735b2983ecb9759dbaf91
//EAAAAU:   350685531728|62f8ce9f74b12f84c123cc23437a4a32
//EAADo1:   256002347743983|374e60f8b9bb6b8cbb30f78030438895
//EAAGO:    438142079694454|fc0a7caa49b192f64f6f5a6d9643bb28
//EAAAAAY:  6628568379|c1e620fa708a1d5696fb991c1bde5662
//EAAVB:    1479723375646806|afb3e4a6d8b868314cc843c21eebc6ae
//EAAC2S:   200424423651082|2a9918c6bcd75b94cefcbb5635c6ad16
//EAATK:    1348564698517390|007c0a9101b9e1c8ffab727666805038
//EAAQr:    1174099472704185|0722a7d5b5a4ac06b11450f7114eb2e9
//EAAI7:    628551730674460|b9693d3e013cfb23ec2c772783d14ce8
//EAAD6V7:  350685531728%7C62f8ce9f74b12f84c123cc23437a4a32
