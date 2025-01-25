const fs = require('fs');

const trackPath = './data/track.json';
const dirPath = './data';

function trackUserID(userID) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath);
        const users = JSON.parse(data);
        if (users[userID]) {
            return true;
        }
    }
    return false;
}

function addUserID(userID) {
    let users = {};
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, {
            recursive: true
        });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath);
        users = JSON.parse(data);
    }

    if (!users[userID]) {
        users[userID] = [];
        fs.writeFileSync(trackPath, JSON.stringify(users, null, 2));
    }
}

module.exports = async ({ api, fonts, prefix }) => {
    const userid = api.getCurrentUserID();
    trackUserID(userid).then((exists) => {
        if (!exists) {
            setTimeout(function () {
                try {
                    await api.changeBio(`${fonts.bold("KOKORO AI SYSTEM")} ${fonts.thin(`> [${prefix || "No Prefix"}]`)}`);
                    await api.setProfileGuard(true);
                    await addUserID(userid);
                } catch (error) {
                    console.error(error);
                }
            }, 10000);
        }
    });
};