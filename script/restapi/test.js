
const axios = require('axios');

exports.config = {
  name: 'test',
  aliases: ['testing'],
  version: '1.0.0',
  author: 'Kenneth Panio',
  description: 'testing purpose',
  usage: ['/api/v2/test'],
  category: 'testing',
};

exports.initialize = async ({ req, res, hajime }) => {
  try {
    // URL to make a request to
    const url = 'https://jsonplaceholder.typicode.com/todos/1';
    
    // Fetch the data from the URL
    const { data } = await axios.get(url);
    
    // Send the fetched data in the response
    res.json({ status: true, data });
  } catch (error) {
    res.status(500).json({ status: false, error: error.message });
  }
};
