module.exports.config = {
    name: "force--logout",
    info: "force logout bot",
    type: "utility",
    cd: 5,
    isPrefix: true,
    role: 1,
};

module.exports.run = async ({ api, chat, event }) => {
    try {
        await chat.reply("Successfully Logout Bot!");
        await api.logout();
        process.exit(1);
    } catch (error) {
        chat.reply("Logout failed. Please try again.");
    }
};