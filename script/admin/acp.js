const moment = require("moment-timezone");

module.exports = {
  config: {
    name: "acp",
    aliases: ["accept", "acc", "fr"],
    credits: "AkhiroDEV/Francis Loyd Raval",
    isPrefix: true,
    role: 1,
    info: "Accepts friend requests from users",
    usage: "[number] or [page]",
  },
  run: async ({ api, args: text, chat, font }) => {
    var mono = txt => font.monospace(txt);

    const handleApprove = async (targetUID) => {
      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestConfirmMutation",
        doc_id: "3147613905362928",
        variables: JSON.stringify({
          input: {
            source: "friends_tab",
            actor_id: api.getCurrentUserID(),
            friend_requester_id: targetUID,
            client_mutation_id: Math.round(Math.random() * 19).toString(),
          },
          scale: 3,
          refresh_num: 0,
        }),
      };
      const success = [];
      const failed = [];
      try {
        const friendRequest = await api.httpPost(
          "https://www.facebook.com/api/graphql/",
          form
        );
        if (JSON.parse(friendRequest).errors) failed.push(targetUID);
        else success.push(targetUID);
      } catch (e) {
        failed.push(targetUID);
      }
      return { success, failed };
    };

    const getPendingRequests = async () => {
      const form = {
        av: api.getCurrentUserID(),
        fb_api_req_friendly_name: "FriendingCometFriendRequestsRootQueryRelayPreloader",
        fb_api_caller_class: "RelayModern",
        doc_id: "4499164963466303",
        variables: JSON.stringify({ input: { scale: 3 } }),
      };
      try {
        const listRequest = JSON.parse(
          await api.httpPost("https://www.facebook.com/api/graphql/", form)
        ).data.viewer.friending_possibilities.edges;

        let requests = listRequest.map((user, index) => ({
          index: index + 1,
          name: user.node.name,
          id: user.node.id,
          url: user.node.url.replace("www.facebook", "facebook"),
          time: moment(user.time * 1000)
            .tz("Asia/Manila")
            .format("DD/MM/YYYY HH:mm:ss"),
        }));

        return requests;
      } catch (error) {
        throw new Error(
          `Failed to fetch friend requests. Please try again later. ${error.message}`
        );
      }
    };

    const printPendingRequests = async (requests, page = 1, limit = 10) => {
      if (requests.length === 0) {
        return chat.reply(mono("There are no pending friend requests."));
      }

      const totalPages = Math.ceil(requests.length / limit);
      if (page > totalPages || page < 1) {
        return chat.reply(mono(`Invalid page number. There are only ${totalPages} pages.`));
      }
      
      const start = (page - 1) * limit;
      const end = start + limit;
      const paginatedRequests = requests.slice(start, end);

      let msg = `Page ${page}/${totalPages}:\n`;
      for (const req of paginatedRequests) {
        msg +=
          `\n${req.index}. Name: ${req.name}` +
          `\nID: ${req.id}` +
          `\nURL: ${req.url}` +
          `\nTime: ${req.time}\n`;
      }
      msg += `\nUse "acp [page]" to navigate or "acp approve [number]" to approve a friend request.`;

      const foo = await chat.reply(mono("Processing..."));
      foo.edit(mono(msg));
    };

    try {
      const requests = await getPendingRequests();
      if (text[0] === "approve") {
        if (text.length !== 2 || isNaN(text[1])) {
          return chat.reply(mono(`Invalid syntax. Use: acp approve [number]`));
        }
        const requestNumber = parseInt(text[1], 10);
        if (requestNumber > 0 && requestNumber <= requests.length) {
          const targetUID = requests[requestNumber - 1].id;
          const { success, failed } = await handleApprove(targetUID);
          if (success.length > 0) {
            chat.reply(mono(`Approved friend request for UID ${success.join(", ")}`));
          }
          if (failed.length > 0) {
            chat.reply(mono(`Failed to approve friend request for UID ${failed.join(", ")}`));
          }
        } else {
          chat.reply(mono(`Invalid number. Please choose a valid request number.`));
        }
      } else {
        let page = 1;
        if (text[0] && !isNaN(text[0])) {
          page = parseInt(text[0], 10);
        }
        await printPendingRequests(requests, page);
      }
    } catch (error) {
      chat.reply(mono(error.message));
    }
  },
};