const axios = require('axios');

const workers = async () => {
    try {
        const url = `https://github.com/haji-mix/-`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        throw error;
    }
};

module.exports = workers;
