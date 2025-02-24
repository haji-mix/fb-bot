'use strict';

const axios = require('axios');
const log = require('npmlog');

//credits Kenneth Panio
// if original credits changed or remove this fca will no longer have a future updates

// take note the sharedPost wont appear in feeds its invisible but it works fine for boosting facebook post shares amount!
const agent = atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ==");

/**
 * Share a post on Facebook using a cookie or token.
 *
 * @param {string} postUrl - The URL of the post to be shared.
 * @param {string} cookieOrToken - A valid Facebook cookie or access token for authentication.
 * @param {number} [shareAmount=1] - The number of times to share the post (default is 1).
 * @param {number} [intervalSeconds=0] - The interval in seconds between each share (default is 0, no interval).
 * 
 * @returns {Promise<Object>} - Returns an object with success status and post IDs or an error message.
 *
 * @example
 * // Share a post once with no interval using a cookie
 * sharePost('https://example.com', 'YOUR_COOKIE');
 *
 * @example
 * // Share a post 5 times with a 2-second interval using a token
 * sharePost('https://example.com', 'YOUR_TOKEN', 5, 2);
 */
module.exports = function (defaultFuncs, api, ctx) {
    return async function sharePost(postUrl, cookieOrToken, shareAmount = 1, privacy = "SELF", intervalSeconds = 0) {
        try {

            if (!postUrl || !cookieOrToken) {
                throw new Error('Missing required parameters: postUrl or cookie/token');
            }

            let accessToken = cookieOrToken;

            if (!cookieOrToken.startsWith('EAAG')) {
                const tokenResponse = await axios.get(
                    "https://business.facebook.com/business_locations",
                    {
                        headers: {
                            "user-agent": agent,
                            "cookie": cookieOrToken
                        }
                    }
                );

                const tokenMatch = tokenResponse.data.match(/EAAG\w+/);
                if (!tokenMatch) {
                    throw new Error('Failed to retrieve access token. Invalid or expired cookie.');
                }
                accessToken = tokenMatch[0];
            }

            const url = `https://graph.facebook.com/me/feed?access_token=${accessToken}`;

            const headers = {
                "authority": "graph.facebook.com",
                "cache-control": "max-age=0",
                "sec-ch-ua-mobile": "?0",
                "User-Agent": agent,
                "Content-Type": "application/json",
                "cookie": cookieOrToken.startsWith('EAAG') ? '' : cookieOrToken
            };
            
            //&fields=id&limit=1&published=0

            const postIds = [];
            for (let i = 0; i < shareAmount; i++) {
                const payload = {
                    link: postUrl,
                    published: 0,
                    limit: 1,
                    fields: "id",
                    privacy: { value: privacy },
                    no_story: true
                };

                const response = await axios.post(url, payload, { headers });

                if (response.data.id) {
                    log.info('sharePost', `Post shared successfully: ${response.data.id}`);
                    postIds.push(response.data.id);
                } else {
                    log.error('sharePost', 'Failed to share post: No post ID returned.');
                }

                if (intervalSeconds > 0 && i < shareAmount - 1) {
                    await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
                }
            }

            return { success: true, postIds };
        } catch (error) {
            log.error('sharePost', error.response?.data || error.message || error);

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'An unknown error occurred'
            };
        }
    };
};