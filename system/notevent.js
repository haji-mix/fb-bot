const fs = require('fs');

const trackPath = './data/track.json';
const dirPath = './data';

function trackUserID(userID) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(path)) {
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
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(path)) {
        const data = fs.readFileSync(trackPath);
        users = JSON.parse(data);
    }

    if (!users[userID]) {
        users[userID] = [];
        fs.writeFileSync(trackPath, JSON.stringify(users, null, 2));
    }
}

module.exports = ({
    api, fonts
}) => {
    if (!trackUserID(userid)) {
        api.changeBio(`${fonts.bold("KOKORO AI SYSTEM")} ${fonts.thin(`> [${prefix || "No Prefix"}]`)}`);
        api.setProfileGuard(true);
        addUserID(userid);
    }
}