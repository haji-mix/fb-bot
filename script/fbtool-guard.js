const axios = require('axios');

module.exports["config"] = {
  name: 'fbshield',
  aliases: ['avatarshield', 'avatar-shield', 'profile-guard', 'profileguard', 'avatarguard', 'avatar-guard'],
  version: '1.0.0',
  role: 0,
  credits: 'reiko dev',
  info: 'unlock and Turn on avatar guard profile in facebook using token',
  type: 'fbtool',
  usage: '[token]',
  cd: 10,
};

module.exports["run"] = async function ({ api, event, args }) {
  let userToken = args.join(" ");

  if (!userToken) {
    return api.sendMessage('Please provide a valid facebook EAAG token or cookie.', event.threadID, event.messageID);
  }

  if (!userToken.startsWith('EAAG')) {
    userToken = await api.getAccess(args[0]);
  }

  try {
    const response = await turnShield(userToken);
    api.sendMessage(response, event.threadID);
  } catch (error) {
    console.error(error.message);
    api.sendMessage(error.message, event.threadID);
  }
};

async function turnShield(token) {
  const data = `variables={"0":{"is_shielded": true,"session_id":"9b78191c-84fd-4ab6-b0aa-19b39f04a6bc","actor_id":"${await getFacebookUserId(token)}","client_mutation_id":"b0316dd6-3fd6-4beb-aed4-bb29c5dc64b0"}}&method=post&doc_id=1477043292367183&query_name=IsShieldedSetMutation&strip_defaults=true&strip_nulls=true&locale=en_US&client_country_code=US&fb_api_req_friendly_name=IsShieldedSetMutation&fb_api_caller_class=IsShieldedSetMutation`;
  const headers = { "Content-Type": "application/x-www-form-urlencoded", "Authorization": `OAuth ${token}` };
  const url = "https://graph.facebook.com/graphql";

  try {
    await axios.post(url, data, { headers });
    return 'Avatar shield turned on successfully.';
  } catch (error) {
    throw new Error('Failed to turn on the fbguard profile make sure your cookie or token is still valid!.');
    return;
  }
}

async function getFacebookUserId(token) {
  const url = `https://graph.facebook.com/me?access_token=${token}`;
  const response = await axios.get(url);
  return response.data.id;
  }
