module.exports["config"] = {
    name: "echoreact",
    info: "echo's users reaction",
    usage: "[on/off]"
}


let enabled = false;

module.exports["handleEvent"] = async ({
    chat, event, Utils
}) => {
    if (enabled && event && event.type === 'message_reaction') {
        if (!Utils.userActivity.reactedMessages.has(event.messageID)) {
            Utils.userActivity.reactedMessages.add(event.messageID);

            setTimeout(() => {
                api.setMessageReaction(event.reaction, event.messageID, (err) => {
                    if (err) {
                        Utils.userActivity.reactedMessages.delete(event.messageID);
                    }
                },
                    true);
            }, 5000);
        }
    }
}

module.exports["run"] = async ({
    chat, event, args
}) => {
    const command = args.join(" ").trim().toLowerCase();
    if (command === "on") {
        enabled = true;
        chat.reply("Echo react is now enabled");
    } else if (command === "off") {
        enabled = false;
        chat.reply("Echo react is now disabled");
    } else {
        chat.reply("This is an event process that copies users reaction of messages. Type 'on' to enable or 'off' to disable resend functionality.");
    }
}