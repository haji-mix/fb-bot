'use strict';

const axios = require('axios');
const log = require('npmlog');

// Credits: Kenneth Panio
// If the original credits are changed or removed, this module will no longer receive future updates.

// Note: The shared post can be configured to be visible or invisible depending on the privacy settings.
const agent = atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhpKQ==");

/**
 * Converts a cookie input (JSON array, object, or string) to a cookie string.
 * @param {string|Array|Object} cookieInput - The cookie input to convert.
 * @returns {string} - The cookie string in the format "key1=value1; key2=value2".
 */
function cookieToString(cookieInput) {
    try {
        if (Array.isArray(cookieInput)) {
            return cookieInput
                .filter(cookie => cookie.name && cookie.value)
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .join('; ');
        } else if (typeof cookieInput === 'object' && cookieInput !== null) {
            return Object.entries(cookieInput)
                .filter(([key, value]) => key && value)
                .map(([key, value]) => `${key}=${value}`)
                .join('; ');
        } else if (typeof cookieInput === 'string' && cookieInput.trim()) {
            return cookieInput;
        }
        log.warn('cookieToString', 'Invalid cookie input provided');
        return '';
    } catch (err) {
        log.error('cookieToString', `Error converting cookie: ${err.message}`);
        return '';
    }
}

/**
 * Share a post on Facebook using a cookie or token.
 *
 * @param {string} postUrl - The URL of the post to be shared.
 * @param {string|Array|Object} cookieOrToken - A valid Facebook cookie (string, JSON array, or object) or access token for authentication.
 * @param {number} [shareAmount=1] - The number of times to share the post (default is 1).
 * @param {string} [privacy="SELF"] - The privacy setting for the shared post. Options include:
 *   - "EVERYONE": The post is public and visible to everyone.
 *   - "ALL_FRIENDS": The post is visible to all friends.
 *   - "FRIENDS_OF_FRIENDS": The post is visible to friends of friends.
 *   - "SELF": The post is visible only to you (invisible to others).
 *   - "CUSTOM": Allows custom privacy settings (requires additional configuration).
 *   Default is "SELF".
 * @param {number} [intervalSeconds=0] - The interval in seconds between each share (default is 0, no interval).
 * 
 * @returns {Promise<Object>} - Returns an object with success status, post IDs, and share count or an error message.
 *
 * @example
 * // Share a post once with no interval using a cookie string (visible only to you)
 * sharePost('https://example.com', 'cookie1=value1; cookie2=value2');
 *
 * @example
 * // Share a post using a JSON array cookie
 * sharePost('https://example.com', [{name: 'cookie1', value: 'value1'}, {name: 'cookie2', value: 'value2'}]);
 *
 * @example
 * // Share a post 5 times with a 2-second interval using a token (visible to friends)
 * sharePost('https://example.com', 'YOUR_TOKEN', 5, "ALL_FRIENDS", 2);
 */
module.exports = function (defaultFuncs, api, ctx) {
    return async function sharePost(postUrl, cookieOrToken, shareAmount = 1, privacy = "SELF", intervalSeconds = 0) {
        let shareCount = 0;

        try {
            if (!postUrl || !cookieOrToken) {
                throw new Error('Missing required parameters: postUrl or cookie/token');
            }

            const validPrivacySettings = ["EVERYONE", "ALL_FRIENDS", "FRIENDS_OF_FRIENDS", "SELF", "CUSTOM"];
            if (!validPrivacySettings.includes(privacy)) {
                throw new Error(`Invalid privacy setting. Valid options are: ${validPrivacySettings.join(', ')}`);
            }

            // Check if cookieOrToken is a token (string without semicolons or key=value format)
            const isToken = typeof cookieOrToken === 'string' && !cookieOrToken.includes(';') && !cookieOrToken.includes('=');
            let appstate;

            if (!isToken) {
                // Convert cookie (string, array, or object) to string
                appstate = cookieToString(cookieOrToken);
                if (!appstate) {
                    throw new Error('Invalid cookie format provided');
                }

                // Fetch access token using cookie
                const tokenResponse = await axios.get(
                    "https://business.facebook.com/business_locations",
                    {
                        headers: {
                            "user-agent": agent,
                            "cookie": appstate
                        }
                    }
                );

                const tokenMatch = tokenResponse.data.match(/EAAG\w+/);
                if (!tokenMatch) {
                    throw new Error('Failed to retrieve access token. Invalid or expired cookie.');
                }
                cookieOrToken = tokenMatch[0]; // Use the retrieved token for the API request
            } else {
                appstate = cookieOrToken; // Use the token directly
            }

            const url = `https://graph.facebook.com/me/feed?access_token=${cookieOrToken}`;

            const headers = {
                "authority": "graph.facebook.com",
                "cache-control": "max-age=0",
                "sec-ch-ua-mobile": "?0",
                "user-agent": agent,
                "content-type": "application/x-www-form-urlencoded",
                "authorization": `Bearer ${cookieOrToken}`,
                "cookie": appstate
            };

            const postIds = [];

            for (let i = 0; i < shareAmount; i++) {
                const payload = {
                    link: postUrl,
                    published: 0,
                    limit: 1,
                    fields: "id",
                    privacy: { value: privacy },
                    no_story: privacy === "SELF"
                };

                const response = await axios.post(url, payload, { headers });

                if (response.data.id) {
                    shareCount++;
                    log.info('sharePost', `Share ${shareCount}/${shareAmount}: Post shared successfully: ${response.data.id}`);
                    postIds.push(response.data.id);
                } else {
                    log.error('sharePost', `Share ${shareCount + 1}/${shareAmount}: Failed to share post: No post ID returned.`);
                }

                if (intervalSeconds > 0 && i < shareAmount - 1) {
                    await new Promise(resolve => setTimeout(resolve, intervalSeconds * 1000));
                }
            }

            return { success: true, postIds, shareCount };
        } catch (error) {
            log.error('sharePost', error.response?.data || error.message || error);

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'An unknown error occurred',
                shareCount
            };
        }
    };
};