'use strict';

const axios = require('axios');
const log = require('npmlog');

const agent = atob("ZmFjZWJvb2tleHRlcm5hbGhpdC8xLjEgKCtodHRwOi8vd3d3LmZhY2Vib29rLmNvbS9leHRlcm5hbGhpdF91YXRleHQucGhwKQ==");

/**
 * Extracts an access token from a Facebook cookie.
 *
 * @param {string} cookie - The Facebook cookie.
 * @returns {Promise<string>} - The extracted access token.
 * @throws {Error} - If the token extraction fails.
 */
async function extractAccessToken(cookie) {
    try {
        const tokenResponse = await axios.get(
            "https://business.facebook.com/business_locations",
            {
                headers: {
                    "user-agent": agent,
                    "cookie": cookie
                }
            }
        );

        const tokenMatch = tokenResponse.data.match(/EAAG\w+/);
        if (!tokenMatch) {
            throw new Error('Failed to retrieve access token. Invalid or expired cookie.');
        }
        return tokenMatch[0];
    } catch (error) {
        throw new Error(`Token extraction failed: ${error.message}`);
    }
}

module.exports = function (defaultFuncs, api, ctx) {
    return async function postVideo(videoUrl, caption, cookieorToken) {
        try {
            // Validate inputs
            if (!videoUrl || !caption || !cookieorToken) {
                throw new Error('Missing required parameters: videoUrl, caption, or cookie/token.');
            }

            let accessToken = cookieorToken;

            // If the input is a cookie (not starting with "EAAG"), extract the token
            if (!cookieorToken.startsWith('EAAG')) {
                accessToken = await extractAccessToken(cookieorToken);
            }

            // Debug: Log the access token (for debugging purposes only, remove in production)
            log.info('postVideo', `Using access token: ${accessToken}`);

            // Step 1: Upload the video
            const uploadResponse = await axios.post(
                'https://graph-video.facebook.com/v18.0/me/videos', // Updated endpoint
                {
                    access_token: accessToken,
                    file_url: videoUrl,
                    description: caption,
                },
                {
                    headers: {
                        "User-Agent": agent,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!uploadResponse.data.id) {
                throw new Error('Failed to upload video: No video ID returned.');
            }

            const videoId = uploadResponse.data.id;
            log.info('postVideo', `Video uploaded successfully. Video ID: ${videoId}`);

            // Step 2: Post the video to the timeline
            const postResponse = await axios.post(
                'https://graph.facebook.com/v18.0/me/feed', // Updated endpoint
                {
                    access_token: accessToken,
                    attached_media: [{ media_fbid: videoId }],
                    message: caption, // Include the caption in the post
                },
                {
                    headers: {
                        "User-Agent": agent,
                        "Content-Type": "application/json",
                    },
                }
            );

            if (!postResponse.data.id) {
                throw new Error('Failed to post video to timeline: No post ID returned.');
            }

            const postId = postResponse.data.id;
            log.info('postVideo', `Video posted to timeline successfully. Post ID: ${postId}`);

            return {
                success: true,
                videoId,
                postId,
            };
        } catch (error) {
            log.error('postVideo', 'Error details:', {
                message: error.message,
                response: error.response?.data,
                stack: error.stack,
            });

            return {
                success: false,
                error: error.response?.data?.error?.message || error.message || 'An unknown error occurred',
            };
        }
    };
};