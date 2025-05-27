module.exports = {
  config: {
    name: "gitlog",
    aliases: ["commits", "gitlogs"],
    type: "utility",
    author: "Kenneth Panio",
    role: 0,
    cooldowns: 15,
    description: "Show the 5 latest commits from haji-mix/fb-bot repository",
    prefix: true,
  },
  run: async ({ chat, format, UNIRedux }) => {
    try {
      const owner = "haji-mix";
      const repo = "fb-bot";
      const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`;

      const axios = require("axios");
      const response = await axios.get(apiUrl);

      if (!response.data || response.data.length === 0) {
        return chat.reply(
          format({
            title: "GIT COMMITS ❌",
            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
            titleFont: "double_struck",
            contentFont: "fancy_italic",
            content: "No commits found for this repository",
          })
        );
      }

      const commits = response.data.map((commit) => {
        const commitData = commit.commit;
        const author = commitData.author.name;
        const date = new Date(commitData.author.date).toLocaleString();
        const message = commitData.message.split("\n")[0];
        const sha = commit.sha.substring(0, 7);
        const url = commit.html_url;

        return {
          author,
          date,
          message,
          sha,
          url,
        };
      });
      const formattedCommits = commits
        .map(
          (commit, index) =>
            `**Commit #${index + 1}**\n` +
            `🔖 **SHA**: ${commit.sha}\n` +
            `👨‍💻 **Author**: ${commit.author}\n` +
            `📅 **Date**: ${commit.date}\n` +
            `✏️ **Message**: ${commit.message}\n` +
            `🔗 **URL**: ${commit.url}`
        )
        .join("\n\n");

      return chat.reply(
        format({
          title: `LATEST COMMITS 🚀`,
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "none",
          content: `**Showing 5 latest commits from ${owner}/${repo}**:\n\n${formattedCommits}`,
        })
      );
    } catch (error) {
      let errorMessage = "An error occurred while fetching commits";
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Repository not found";
        } else if (error.response.status === 403) {
          errorMessage = "API rate limit exceeded (try again later)";
        }
      }

      return chat.reply(
        format({
          title: "GIT COMMITS ERROR ❌",
          titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
          titleFont: "double_struck",
          contentFont: "fancy_italic",
          content: errorMessage,
        })
      );
    }
  },
};
