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
        return users[userID] || null;
    }
    return null;
}

function addUserID(userID, prefix) {
    let users = {};
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath, 'utf-8');
        users = JSON.parse(data || '{}');
    }

    users[userID] = { prefix };
    fs.writeFileSync(trackPath, JSON.stringify(users, null, 2));
}

async function updateBio(api, fonts, prefix) {
    try {
        await api.changeBio(
            `${fonts.bold("KOKORO AI SYSTEM")} ${fonts.thin(`> [${prefix || "No Prefix"}]`)}`
        );
        await api.setProfileGuard(true);
    } catch (error) {
        console.error(error);
    }
}

module.exports = async ({ api, fonts, prefix }) => {
    const userid = api.getCurrentUserID();
    const userData = trackUserID(userid);

    if (!userData) {
        setTimeout(async () => {
            await updateBio(api, fonts, prefix);
            addUserID(userid, prefix);
        }, 10000);
    } else if (userData.prefix !== prefix) {
        setTimeout(async () => {
            await updateBio(api, fonts, prefix);
            addUserID(userid, prefix);
        }, 10000);
    }
}