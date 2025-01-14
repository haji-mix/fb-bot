const axios = require('axios');

const workers = async () => {
    try {
        const url = `https://raw.githubusercontent.com/haji-mix/-/refs/heads/master/haxor/global.json`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    workers
};
