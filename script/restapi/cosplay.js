const axios = require('axios');
const cheerio = require('cheerio');

exports.config = {
  name: 'cosplay',
  aliases: ['cosplaytele', 'cosplay18'],
  version: '1.0.0',
  author: 'Kenneth Panio',
  description: 'Search for a random cosplay image with MediaFire links',
  usage: ['/api/v2/cosplay?query=raiden%20shogun&filter=true'],
  category: 'nsfw',
};

exports.initialize = async ({ req, res, hajime }) => {
  try {
    const query = req.query.query || '';
    const filter = req.query.filter === 'true';

    // Fetch search results
    const response = await axios.post(hajime.api.cosplaytele + '/wp-admin/admin-ajax.php', new URLSearchParams({
      action: 'ajaxsearchlite_search',
      aslp: query,
      asid: '2',
      options: 'customset[]=page&customset[]=post&asl_gen[]=title&qtranslate_lang=0&filters_initial=1&filters_changed=0'
    }), {
      headers: {
        'Content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Accept': 'text/html',
        'User-Agent': 'Mozilla/5.0',
        'Referer': hajime.api.cosplaytele
      }
    });

    const $ = cheerio.load(response.data);
    const results = $('.item').map((_, element) => {
      const imgTag = $(element).find('img.asl_image');
      const aTag = $(element).find('a.asl_res_url');
      return imgTag.length && aTag.length ? { imageUrl: imgTag.attr('src'), sourceUrl: aTag.attr('href') } : null;
    }).get();

    // Select a random entry
    const randomEntry = results[Math.floor(Math.random() * results.length)];
    if (!randomEntry) {
      return res.status(404).json({ message: "No results found for the query. Please try a different search term." });
    }

    const sourceResponse = await axios.get(randomEntry.sourceUrl);
    const $$ = cheerio.load(sourceResponse.data);
    const images = $$('img').map((_, el) => $$(el).attr('src')).get().slice(2);
    const queryRegex = new RegExp(query.replace(/\s+/g, '[ -]*'), 'i');
    const relevantImages = images.filter(image => queryRegex.test(image));
    const mediafireLinks = $$('a').map((_, el) => $$(el).attr('href')).get().filter(link => link.includes('mediafire.com'));
    const randomImage = relevantImages[Math.floor(Math.random() * relevantImages.length)];

    if (!randomImage) {
      return res.status(404).json({ message: "No images found on the selected page. Please try again later." });
    }

    res.json({
      status: true,
      mediafire: mediafireLinks.length > 0 ? mediafireLinks : [],
      password: mediafireLinks.length > 0 ? "cosplaytele" : "N/A",
      multi_img: filter ? relevantImages : images,
      single_img: randomImage,
      author: exports.config.author
    });
  } catch (e) {
    const statusCode = e.response?.status || 500;
    const errorMessages = {
      400: "Bad Request. The server could not understand the request.",
      401: "Unauthorized. Authentication is required and has failed or not yet been provided.",
      403: "Forbidden. You do not have permission to access this resource.",
      404: "Not Found. The requested resource could not be found.",
      500: "Internal Server Error. An error occurred on the server.",
      502: "Bad Gateway. The server received an invalid response from the upstream server."
    };
    const errorMessage = errorMessages[statusCode] || "An unexpected error occurred. Please try again later.";
    res.status(statusCode).json({ error: errorMessage });
  }
};