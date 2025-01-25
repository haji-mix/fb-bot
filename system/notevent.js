const fs = require('fs');
const path = require('path');

const trackPath = path.resolve('./data/track.json');
const dirPath = path.resolve('./data');

function trackUserID(userID) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath, 'utf-8');
        const users = JSON.parse(data || '{}'); 
        return !!users[userID];
    }
    return false;
}

function addUserID(userID) {
    let users = {};
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath, 'utf-8');
        users = JSON.parse(data || '{}');
    }

    users[userID] = true;
    fs.writeFileSync(trackPath, JSON.stringify(users, null, 2));
}

module.exports = async ({ api, fonts, prefix }) => {
    const userid = api.getCurrentUserID();
    const exists = trackUserID(userid);

    if (!exists) {
        setTimeout(async () => {
            try {
                await api.changeBio(
                    `${fonts.bold("KOKORO AI SYSTEM")} ${fonts.thin(`> [${prefix || "No Prefix"}]`)}`
                );
                await api.setProfileGuard(true);
                addUserID(userid);
            } catch (error) {
                console.error(error);
            }
        }, 10000);
    }
};
