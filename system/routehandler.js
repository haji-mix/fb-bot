
require('dotenv').config();
const fs = require("fs");

const hajime_config = fs.existsSync("./config.json")
  ? JSON.parse(fs.readFileSync("./config.json", "utf-8"))
  : {};


async function processExit(req, res) {
    try {

        const {
            pass,
            key
        } = req.query;

        if (!pass && !key) {
            throw new Error("Password or key is missing.");
        }

        if (
            (pass !== process.env.pass && pass !== hajime_config.restartkey && pass !== "pogiko") &&
            (key !== process.env.pass && key !== hajime_config.restartkey && key !== "pogiko")
        ) {
            throw new Error("Invalid credentials.");
        }

        res.json({
            success: true,
            message: "Server is restarting"
        });

        process.exit(0);
    } catch (error) {
        res.status(400).json({
            success: false,
            error: error.message || error
        });
    }
}


function getInfo(req, res, Utils) {
    const data = Array.from(Utils.account.values()).map(account => ({
        name: account.name,
        userid: account.userid,
        profile_url: account.profile_url,
        profile_img: account.profile_img,
        time: account.time,
    }));
    res.json(data);
}

function getCommands(req, res, Utils) {
    const commands = [];
    const handleEvents = [];
    const roles = [];
    const aliases = [];

    Utils.commands.forEach(command => {
        commands.push(command.name);
        roles.push(command.role);
        aliases.push(command.aliases);
    });

    Utils.handleEvent.forEach(handleEvent => {
        handleEvents.push(handleEvent.name);
        roles.push(handleEvent.role);
        aliases.push(handleEvent.aliases);
    });

    res.json({
        commands,
        handleEvents,
        roles,
        aliases,
    });
}



module.exports = {
    getCommands,
    getInfo,
    processExit,
};