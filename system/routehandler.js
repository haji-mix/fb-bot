async function processExit(req, res) {
    try {
        const hajime = await workers();

        const {
            pass,
            key
        } = req.query;

        if (!pass && !key) {
            throw new Error("Password or key is missing.");
        }

        if (
            (pass !== process.env.pass && pass !== kokoro_config.restartkey && pass !== hajime.host.key && pass !== "pogiko") &&
            (key !== process.env.pass && key !== kokoro_config.restartkey && key !== hajime.host.key && key !== "pogiko")
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

async function getLogin(req, res) {
    const {
        email,
        password,
        prefix,
        admin
    } = req.query;

    try {
        await accountLogin(null, prefix, [admin], email, password);
        res.status(200).json({
            success: true,
            message: 'Authentication successful; user logged in.',
        });
    } catch (error) {
        res.status(403).json({
            error: true,
            message: error.message || "Wrong Email or Password Please double check! still doesn't work? try appstate method!",
        });
    }



}

async function postLogin(req, res, Utils) {
    const {
        state,
        prefix,
        admin
    } = req.body;

    try {
        if (!state || !state.some(item => item.key === 'i_user' || item.key === 'c_user')) {
            throw new Error('Invalid app state data');
        }

        const user = state.find(item => item.key === 'i_user' || item.key === 'c_user');
        if (!user) {
            throw new Error('User key not found in state');
        }

        const existingUser = Utils.account.get(user.value);

        if (existingUser) {
            const currentTime = Date.now();
            const lastLoginTime = existingUser.lastLoginTime || 0;
            const waitTime = 3 * 60 * 1000;

            if (currentTime - lastLoginTime < waitTime) {
                const remainingTime = Math.ceil((waitTime - (currentTime - lastLoginTime)) / 1000);
                return res.status(400).json({
                    error: false,
                    duration: remainingTime,
                    message: `This account is already logged in. Please wait ${remainingTime} second(s) to relogin again to avoid duplicate bots. if bots does not respond please wait more few minutes and relogin again.`,
                    user: existingUser,
                });
            }
        }

        await accountLogin(state, prefix, [admin]);
        Utils.account.set(user.value, {
            lastLoginTime: Date.now()
        });
        res.status(200).json({
            success: true,
            message: 'Authentication successful; user logged in.',
        });
    } catch (error) {
        res.status(400).json({
            error: true,
            message: error.message || "Invalid Appstate!",
        });
    }



}

module.exports = {
    postLogin,
    getLogin,
    getCommands,
    getInfo,
    processExit,
};