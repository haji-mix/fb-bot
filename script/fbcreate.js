const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const FormData = require('form-data');
const randomUseragent = require('random-useragent');  // Import the random-useragent package

module.exports["config"] = {
    name: "fbcreate",
    info: "Automatically create a Facebook account.",
    isPrefix: true,
    usage: "[amount]",
    role: 1,
};

module.exports["run"] = async ({ chat, font, args }) => {
    try {
        const password = "@Ken2024";  
        const amount = parseInt(args[0], 10) || 1;
        const createdAccounts = [];
        let statusMessages = ""; 
        async function ugenX() {
            return randomUseragent.getRandom(); 
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

        async function fakeName() {
            const response = await axios.get('https://fakerapi.it/api/v1/users?locale=en_US&quantity=1');
            const first = response.data.data[0].firstname;
            const last = response.data.data[0].lastname;
            return { first, last };
        }

        async function main() {
            await chat.reply(font.thin("Creating FB Accounts...."));

            for (let make = 0; make < amount; make++) {
                const session = axios.create({ withCredentials: true });
                const response = await session.get('https://x.facebook.com/reg', {
                    params: {
                        "_rdc": "1",
                        "_rdr": "",
                        "wtsid": "rdr_0t3qOXoIHbMS6isLw",
                        "refsrc": "deprecated",
                    }
                });

                const email = await getEmail();
                if (!email) {
                    console.log("Failed to get email. Skipping account creation.");
                    continue;
                }

                const { first, last } = await fakeName();
                console.log(`NAME  - ${first} ${last}`);
                console.log(`EMAIL - ${email}`);

                const formData = new FormData();
                formData.append('firstname', first);
                formData.append('lastname', last);
                formData.append('reg_email__', email);
                formData.append('sex', '2');
                formData.append('reg_passwd__', password); 

                const headers = {
                    ...formData.getHeaders(),
                    "User-Agent": await ugenX(), 
                };

                const reg_url = "https://www.facebook.com/reg/submit/";
                const py_submit = await session.post(reg_url, formData, { headers });

                let accountStatus = ""; 
                let cookieString = ""; 
                const cookies = py_submit.headers['set-cookie'];
                if (cookies && cookies.some(cookie => cookie.includes('c_user'))) {
                    const uid = cookies.find(cookie => cookie.includes('c_user')).split('=')[1].split(';')[0];
                    console.log(`FB UID - ${uid}`);
                    console.log(`LOGIN OTP - OTP-CODE`);
                    const otp = await getCode(email);
                    if (otp) {
                        const confirmed = await confirmId(email, uid, otp, session);
                        if (confirmed) {
                            cookieString = cookies.join('; '); 
                            accountStatus = `UID: ${uid}\nEmail: ${email}\nPassword: ${password}\nOTP: ${otp}\nCookie: ${cookieString}\n`;
                            createdAccounts.push({ uid, email, password, cookie: cookieString });
                        } else {
                            accountStatus = `Account Disabled\nUID: ${uid}\nEmail: ${email}\nPassword: ${password}\n`;
                        }
                    } else {
                        accountStatus = `OTP Failed\nUID: ${uid}\nEmail: ${email}\nPassword: ${password}\n`;
                    }
                } else {
                    accountStatus = `Account Creation Failed\nEmail: ${email}\nPassword: ${password}\n`;
                }

                statusMessages += accountStatus + "\n";
            }

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
                    'User-Agent': await ugenX(),
                };

                const response = await session.post(url, params, { headers });

                if (response.request.res.responseUrl.includes("checkpoint")) {
                    console.log(`ACCOUNT DISABLED: ${uid}`);
                    return false;  
                } else {
                    console.log(`ID CONFIRMED - ${uid}`);
                    return true; 
                }
            } catch (e) {
                console.log(e.message);
                return false; 
            }
        }

        await main();
    } catch (e) {
        chat.reply(font.thin(e.message));
    }
};
