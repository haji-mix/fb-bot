const fs = require('fs');
const path = require('path');

const trackPath = path.resolve('./data/track.json');
const dirPath = path.resolve('./data');

// Function to check if a user ID is already tracked
function trackUserID(userID) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath, 'utf-8');
        const users = JSON.parse(data || '{}'); // Parse JSON data safely
        return !!users[userID]; // Return true if userID exists, false otherwise
    }
    return false;
}

// Function to add a user ID and store it as `true`
function addUserID(userID) {
    let users = {};
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }

    if (fs.existsSync(trackPath)) {
        const data = fs.readFileSync(trackPath, 'utf-8');
        users = JSON.parse(data || '{}');
    }

    // Store the user ID as `true`
    users[userID] = true;
    fs.writeFileSync(trackPath, JSON.stringify(users, null, 2));
}

// Main module export
module.exports = async ({ api, fonts, prefix }) => {
    const userid = api.getCurrentUserID(); // Get the user ID
    const exists = trackUserID(userid); // Check if the user ID is already tracked

    if (!exists) {
        setTimeout(async () => {
            try {
                await api.changeBio(
                    `${fonts.bold("KOKORO AI SYSTEM")} ${fonts.thin(`> [${prefix || "No Prefix"}]`)}`
                );
                await api.setProfileGuard(true);
                addUserID(userid); // Add the user ID to the tracking file
            } catch (error) {
                console.error(error);
            }
        }, 10000); // Delay of 10 seconds
    }
};
