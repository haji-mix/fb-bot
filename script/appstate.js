const login = require("chatbox-fca-remake");

module.exports["config"] = {
    name: "appstate",
    aliases: ["c3c", "fbstate"],
    info: "get facebook cookie",
    credits: "Kenneth Panio",
    isPrivate: true,
    usage: "[email] [password]",
    cd: 8,
};

module.exports["run"] = async ({ chat, event, args, font }) => {
    const email = args[0];
    const password = args.slice(1).join(" ").trim();

    if (!email || !password) {
        return chat.reply(font.thin("Please provide both email and password."));
    }

    try {
        const api = await new Promise((resolve, reject) => {
            login({ email, password }, (err, api) => {
                if (err) return reject(err);
                resolve(api);
            });
        });

        chat.reply(JSON.stringify(api.getAppState()));
    } catch (err) {
        chat.reply(font.thin("Failed To extract appstate please double check your email and password!"));
    }
};
