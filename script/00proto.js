module.exports = {
    manifest: {
        name: "proto",
        description: "testing purpose",
    },
    async deploy({ chat, args, fonts }) {
        chat.send(fonts.bold("bruh"));
    }
};
