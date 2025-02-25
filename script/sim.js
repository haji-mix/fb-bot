const devs = require(__dirname.replace("/script", "") + '/system/api');

module.exports["config"] = {
  name: "sim",
  version: "1.0.0",
  role: 0,
  aliases: ["Sim"],
  credits: "cliff",//api by mark & modify
  info: "Talk to sim",
  cd: 0
};

module.exports["run"] = async function({ api, event, args }) {
  const axios = require("axios");
  let { messageID, threadID, senderID, body } = event;
  let tid = threadID,
      mid = messageID;
  const content = encodeURIComponent(args.join(" "));
  if (!args[0]) return api.sendMessage("Please type a message...", tid, mid);
  try {
      const res = await axios.get(`${devs.markdevs69}/sim?q=${content}`);
      const respond = res.data.response;
      if (res.data.error) {
          api.sendMessage(`Error: ${res.data.error}`, tid, (error, info) => {
              if (error) {
                  console.error(error);
              }
          }, mid);
      } else {
          api.sendMessage(respond, tid, (error, info) => {
              if (error) {
                  console.error(error);
              }
          }, mid);
      }
  } catch (error) {
      console.error(error);
      api.sendMessage("An error occurred while fetching the data.", tid, mid);
  }
};