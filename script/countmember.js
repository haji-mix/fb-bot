module.exports["config"] = {
  name: "countmember",
  aliases: ["countmem", "totalmem", "totalmember", "totalm", "countm"],
  version: "1.0.0",
  isGroup: true,
  info: "Count the total number of participants in the group",
};

module.exports["run"] = async ({ chat, font, event }) => {
    
    const threadInfo = await chat.threadInfo(event.threadID);
    const totalParticipants = threadInfo?.participantIDs.length || event?.participantIDs.length;
    
      if (!totalParticipants) {
          return chat.reply(font.monospace("Bot is tempory block by facebook can't use this feature : <"));
      }

    chat.reply(font.monospace(`Total number of participants in this group: ${totalParticipants}`));
};
