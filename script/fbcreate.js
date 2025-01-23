const axios = require('axios');
const randomUseragent = require('random-useragent'); // Use the random-useragent package already in use
const cheerio = require('cheerio'); // Use Cheerio for parsing HTML (for extracting m_ts, etc.)

module.exports["config"] = {
    name: "fbcreate",
    info: "Automatically create a Facebook account.",
    isPrefix: true,
    usage: "[amount]",
    role: 1,
};

module.exports["run"] = async ({
    chat, font, args
}) => {
    try {
        const password = "@Ken2024"; // Password for the account
        const amount = parseInt(args[0], 10) || 1;
        const createdAccounts = [];
        let statusMessages = ""; // Accumulate status messages here

        // Function to generate random user-agent using the random-useragent npm package
        function getRandomUserAgent() {
            const userAgent = randomUseragent.getRandom(); // Get a random user-agent string
            return userAgent;
        }
        
        async function getEmail() {
            try {
                const response = await axios.post('https://api.internal.temp-mail.io/api/v3/email/new');
                if (response.data && response.data.email) {
                    return response.data.email;
                } else {
                    throw new Error("Failed to get email");
                }
            } catch (error) {
                console.error(error);
                return null;
            }
        }
        
        async function getCode(email) {
            try {
                const response = await axios.get(`https://api.internal.temp-mail.io/api/v3/email/${email}/messages`);
                if (response.data && response.data.text) {
                    const regex = /FB-(\d+)/;
                    const match = regex.exec(response.data.text);
                    return match ? match[1] : null;
                } else {
                    throw new Error("No text found in email response");
                }
            } catch (error) {
                console.error(error);
                return null;
            }
        }

        // Function to get random name and email from Faker API
        async function getFakerData() {
            try {
                const response = await axios.get('https://randomuser.me/api/');
                const user = response.data.results[0];
                const firstName = user.name.first;
                const lastName = user.name.last;
                const email = await getEmail();
                return {
                    firstName,
                    lastName,
                    email
                };
            } catch (error) {
                console.error("Error fetching Faker API data:", error);
                return null;
            }
        }

        // Function to extract m_ts and other necessary fields
        async function extractTokens(session) {
            const mtsResponse = await session.get("https://x.facebook.com");
            const $ = cheerio.load(mtsResponse.data);
            const m_ts = $("input[name='m_ts']").val(); // Extract m_ts value
            const lsd = $("input[name='lsd']").val(); // Extract lsd value
            const jazoest = $("input[name='jazoest']").val(); // Extract jazoest value
            const reg_impression_id = $("input[name='reg_impression_id']").val();
            const logger_id = $("input[name='logger_id']").val();
            const reg_instance = $("input[name='reg_instance']").val();

            return {
                m_ts,
                lsd,
                jazoest,
                logger_id,
                reg_instance,
                reg_impression_id
            };
        }

        async function main() {
            await chat.reply(font.thin("Creating FB Accounts...."));

            for (let make = 0; make < amount; make++) {
                const session = axios.create({
                    withCredentials: true
                });

                // Extract necessary tokens like m_ts, lsd, jazoest, etc.
                const {
                    m_ts,
                    lsd,
                    jazoest
                } = await extractTokens(session);

                const {
                    firstName,
                    lastName,
                    email
                } = await getFakerData();
                if (!email) {
                    console.log("Failed to get email. Skipping account creation.");
                    continue;
                }

                console.log(`NAME  - ${firstName} ${lastName}`);
                console.log(`EMAIL - ${email}`);

                // Define your payload object
                const payload = {
                    'ccp': "2",
                    'reg_instance': reg_instance,
                    'submission_request': "true",
                    'helper': "",
                    'reg_impression_id': reg_impression_id,
                    'ns': "1",
                    'zero_header_af_client': "",
                    'app_id': "103",
                    'logger_id': logger_id,
                    'field_names[0]': "firstname",
                    'firstname': firstName,
                    'lastname': lastName,
                    'field_names[1]': "birthday_wrapper",
                    'birthday_day': Math.floor(Math.random() * 28) + 1,
                    'birthday_month': Math.floor(Math.random() * 12) + 1,
                    'birthday_year': Math.floor(Math.random() * (2009 - 1992 + 1)) + 1992,
                    'age_step_input': "",
                    'did_use_age': "false",
                    'field_names[2]': "reg_email__",
                    'reg_email__': email,
                    'field_names[3]': "sex",
                    'sex': "2",
                    'preferred_pronoun': "",
                    'custom_gender': "",
                    'field_names[4]': "reg_passwd__",
                    'name_suggest_elig': "false",
                    'was_shown_name_suggestions': "false",
                    'did_use_suggested_name': "false",
                    'use_custom_gender': "false",
                    'guid': "",
                    'pre_form_step': "",
                    'encpass': `#PWD_BROWSER:0:${Math.floor(Date.now() / 1000)}:MrCode@123`,
                    'submit': "Sign Up",
                    'fb_dtsg': "NAcMC2x5X2VrJ7jhipS0eIpYv1zLRrDsb5y2wzau2bw3ipw88fbS_9A:0:0",
                    'jazoest': jazoest,
                    'lsd': lsd,
                    '__dyn': "1ZaaAG1mxu1oz-l0BBBzEnxG6U4a2i5U4e0C8dEc8uwcC4o2fwcW4o3Bw4Ewk9E4W0pKq0FE6S0x81vohw5Owk8aE36wqEd8dE2YwbK0iC1qw8W0k-0jG3qaw4kwbS1Lw9C0le0ue0QU",
                    '__csr': "",
                    '__req': "p",
                    '__fmt': "1",
                    '__a': "AYkiA9jnQluJEy73F8jWiQ3NTzmH7L6RFbnJ_SMT_duZcpo2yLDpuVXfU2doLhZ-H1lSX6ucxsegViw9lLO6uRx31-SpnBlUEDawD_8U7AY4kQ",
                    '__user': "0"
                };

                const reg_url = `https://www.facebook.com/reg/submit/?privacy_mutation_token=eyJ0eXBlIjowLCJjcmVhdGlvbl90aW1lIjoxNzM0NDE0OTk2LCJjYWxsc2l0ZV9pZCI6OTA3OTI0NDAyOTQ4MDU4fQ%3D%3D&multi_step_form=1&skip_suma=0&shouldForceMTouch=1`;
                const py_submit = await session.post(reg_url, payload, {
                    headers: {
                        "User-Agent": getRandomUserAgent(),
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                        "dnt": "1",
                        "X-Requested-With": "mark.via.gp",
                        "Sec-Fetch-Site": "none",
                        "Sec-Fetch-Mode": "navigate",
                        "Sec-Fetch-User": "?1",
                        "Sec-Fetch-Dest": "document",
                    }
                });

                let accountStatus = ""; // Store the status of each account
                let cookieString = ""; // To store the cookie string if available

                // Check for c_user cookie to determine if account is created
                const cookies = py_submit.headers['set-cookie'];
                if (cookies && cookies.some(cookie => cookie.includes('c_user'))) {
                    const uid = cookies.find(cookie => cookie.includes('c_user')).split('=')[1].split(';')[0];
                    console.log(`FB UID - ${uid}`);
                    console.log(`LOGIN OTP - OTP-CODE`);
                    const otp = await getCode(email); // Get OTP for email
                    if (otp) {
                        const confirmed = await confirmId(email, uid, otp, session);
                        if (confirmed) {
                            cookieString = cookies.join('; '); // Convert cookies to a string
                            accountStatus = `UID: ${uid}\nEmail: ${email}\nPassword: ${password}\nOTP: ${otp}\nCookie: ${cookieString}\n`;
                            createdAccounts.push({
                                uid, email, password, cookie: cookieString
                            });
                        } else {
                            accountStatus = `Account Disabled\nUID: ${uid}\nEmail: ${email}\nPassword: ${password}\n`;
                        }
                    } else {
                        accountStatus = `OTP Failed\nUID: ${uid}\nEmail: ${email}\nPassword: ${password}\n`;
                    }
                } else {
                    accountStatus = `Account Creation Failed\nEmail: ${email}\nPassword: ${password}\n`;
                }

                // Append account status to the overall status messages
                statusMessages += accountStatus + "\n";
            }

            // Reply with all the status messages after all account creation attempts
            chat.reply(statusMessages);
        }

        async function confirmId(mail, uid, otp, session) {
            try {
                const url = "https://m.facebook.com/confirmation_cliff/";
                const params = new URLSearchParams({
                    'contact': mail,
                    'type': "submit",
                    'is_soft_cliff': "false",
                    'medium': "email",
                    'code': otp,
                });

                const headers = {
                    'User-Agent': getRandomUserAgent(),
                    'Accept-Encoding': "gzip, deflate, br, zstd",
                    'sec-ch-ua-full-version-list': "",
                    'sec-ch-ua-platform': "\"Android\"",
                    'sec-ch-ua': "\"Android WebView\";v=\"131\", \"Chromium\";v=\"131\", \"Not_A Brand\";v=\"24\"",
                    'sec-ch-ua-model': "\"\"",
                    'sec-ch-ua-mobile': "?1",
                    'x-asbd-id': "129477",
                    'x-fb-lsd': "KnpjLz-YdSXR3zBqds98cK",
                    'sec-ch-prefers-color-scheme': "light",
                    'origin': "https://m.facebook.com",
                    'x-requested-with': "mark.via.gp",
                    'sec-fetch-site': "same-origin",
                    'sec-fetch-mode': "cors",
                    'sec-fetch-dest': "empty",
                    'referer': "https://m.facebook.com/confirmemail.php?next=https%3A%2F%2Fm.facebook.com%2F%3Fdeoia%3D1&soft=hjk",
                    'accept-language': "en-GB,en-US;q=0.9,en;q=0.8",
                    'priority': "u=1, i"
                };

                const response = await session.post(url, {
                    params, headers
                });
                if (response.data.includes('checkpoint')) {
                    return false; // Failed
                } else {
                    return true; // Successful confirmation
                }
            } catch (error) {
                console.error("Error confirming ID:", error);
                return false;
            }
        }

        main();

    } catch (error) {
        console.error("Error during account creation:", error);
    }
};