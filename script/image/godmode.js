import axios from "axios";
import fs from "fs";
import path from "path";

export default {
  config: {
    name: "god-mode",
    aliases: ["gm", "god"],
    type: "Labskars",
    author: "Aljur",
    role: 0,
  },

  run: async ({ chat, event, api, format }) => {
    try {
      const formattedText = format({
        title: "☠ GOD MODE ACTIVATED ☠",
        titleFont: "double_struck",
        contentFont: "fancy_bold",
        content: "Power overwhelming... // Labskars",
      });

      const imgUrl = "https://files.catbox.moe/io23jc.png";
      const imgPath = path.join(__dirname, "godmode.png");
      const response = await axios.get(imgUrl, { responseType: "arraybuffer" });
      fs.writeFileSync(imgPath, Buffer.from(response.data, "binary"));

      await chat.reply({
        body: formattedText,
        attachment: fs.createReadStream(imgPath),
      });

      fs.unlinkSync(imgPath);
    } catch (error) {
      const errorText = format({
        title: "No labskars sorry",
        titleFont: "double_struck",
        contentFont: "fancy_italic",
        content: `Failed to activate GOD MODE: ${error.message}`,
      });
      chat.reply(errorText);
    }
  },
};
