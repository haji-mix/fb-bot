module.exports = {
    config: {
        name: "setname",
        aliases: ["changename", "namechange"],
        type: "economy",
        author: "Kenneth Panio | Aljur Pogoy",
        usage: "[new name]",
        role: 0,
        cooldowns: 86400, 
        description: "Change your character name (costs money)",
        prefix: true
    },
    style: {
        title: {
            text_font: "bold",
            content: "〘 ✏️ 〙 SETNAME",
            line_bottom: "default",
        },
        titleFont: "bold",
        contentFont: "fancy",
    },
    run: async ({ chat, event, Utils, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const { Currencies } = Utils;
            const args = event.body?.split(" ").slice(1) || [];
            const newName = args.join(" ").trim();

            if (!newName) {
                const errorText = format({
                    title: 'Name Change ❌',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: "Please provide a new name! Usage: `setname <new_name>`"
                });
                return chat.reply(errorText);
            }

            if (newName.length > 20) {
                const errorText = format({
                    title: 'Name Change ❌',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: "Name too long! Maximum 20 characters."
                });
                return chat.reply(errorText);
            }

            const userData = await Currencies.getData(senderID);
            const currentBalance = userData.balance || 0;
            const currentName = userData.name || "Unregistered";

            const nameChangeCost = 500 + (Math.floor((userData.exp || 0) / 100) * 100);

            if (currentBalance < nameChangeCost) {
                const errorText = format({
                    title: 'Name Change ❌',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    content: `You need **$${nameChangeCost.toLocaleString()}** to change your name!\nCurrent balance: **$${currentBalance.toLocaleString()}**`
                });
                return chat.reply(errorText);
            }

            await Currencies.setData(senderID, { 
                name: newName,
                balance: currentBalance - nameChangeCost 
            });

            const successText = format({
                title: 'Name Change ✅',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: `Successfully changed your name from **${currentName}** to **${newName}**!\n\n**Cost:** $${nameChangeCost.toLocaleString()}\n**New Balance:** $${(currentBalance - nameChangeCost).toLocaleString()}\n\n⚠️ You can change your name again after **24 hours**.`
            });
            chat.reply(successText);

        } catch (error) {
            const errorText = format({
                title: 'Error ❌',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                content: error.stack || error.message || 'ERROR: Failed to setname!'
            });
            chat.reply(errorText);
        }
    }
};