const axios = require('axios');
const { JSDOM } = require('jsdom');
const fs = require('fs');
const FormData = require('form-data');

module.exports["config"] = {
    name: "fbcreate",
    info: "Automatically create a Facebook account.",
    isPrefix: true,
    usage: "[amount]",
    role: 1,
};

module.exports["run"] = async ({ chat, font, args }) => {
    try {
        const amount = parseInt(args[0], 10) || 1;
        const createdAccounts = [];

        async function ugenX() {
            const userAgents = [
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/11.1 Safari/605.1.15',
                'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/41.0.2228.0 Safari/537.36',
            ];
            return userAgents[Math.floor(Math.random() * userAgents.length)];
        }

        async function getEmail() {
            const response = await axios.post('https://api.internal.temp-mail.io/api/v3/email/new');
            return response.data.email;
        }

        async function getCode(email) {
            try {
                const response = await axios.get(`https://api.internal.temp-mail.io/api/v3/email/${email}/messages`);
                const regex = /FB-(\d+)/;
                const match = regex.exec(response.data.text);
                return match ? match[1] : null;
            } catch {
                return null;
            }
        }

        async function fakeName() {
            const response = await axios.get('https://fakerapi.it/api/v1/users?locale=en_US&quantity=1');
            const first = response.data.data[0].firstname;
            const last = response.data.data[0].lastname;
            return { first, last };
        }

        function extractor(data) {
            try {
                const dom = new JSDOM(data);
                const document = dom.window.document;
                const inputs = document.querySelectorAll("input");
                const formData = {};
                inputs.forEach(input => {
                    const name = input.name;
                    const value = input.value;
                    if (name) {
                        formData[name] = value;
                    }
                });
                return formData;
            } catch (e) {
                return { error: String(e) };
            }
        }

        async function main() {
            await chat.reply(font.thin("PRESS ENTER TO START...."));

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
                const { first, last } = await fakeName(); 
                console.log(`NAME  - ${first} ${last}`);
                console.log(`EMAIL - ${email}`);

                const formData = new FormData();
                formData.append('firstname', first);
                formData.append('lastname', last);
                formData.append('reg_email__', email);
                formData.append('sex', '2');
                formData.append('reg_passwd__', `MrCode@123`);

                const headers = {
                    ...formData.getHeaders(),
                    "User-Agent": await ugenX(),
                };

                const reg_url = "https://www.facebook.com/reg/submit/";
                const py_submit = await session.post(reg_url, formData, { headers });

                if (py_submit.headers['set-cookie'].some(cookie => cookie.includes('c_user'))) {
                    const uid = py_submit.headers['set-cookie'].find(cookie => cookie.includes('c_user')).split('=')[1].split(';')[0];
                    console.log(`FB UID - ${uid}`);
                    console.log(`LOGIN OTP - OTP-CODE`);
                    await confirmId(email, uid, "OTP-CODE", session);
                    createdAccounts.push({ uid, email, password: '@Ken2024' });
                } else {
                    console.log(`SUCCESSFULLY CHECKPOINT ID`);
                }
            }

            const accountMessages = createdAccounts.map(acc => `UID: ${acc.uid}, Email: ${acc.email}, Password: ${acc.password}`).join('\n');
            await chat.reply(font.thin(`Created Accounts:\n${accountMessages}`));
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
                    console.log(`ID DISABLED`);
                } else {
                    const cookie = response.headers['set-cookie'].join(";");
                    console.log(`SUCCESS - ${uid}|MrCode@123|${cookie}`);
                    fs.appendFileSync("/sdcard/SUCCESS-OK-ID.txt", `${uid}|MrCode@123|${cookie}\n`);
                }
            } catch (e) {
                console.log(e.message);
            }
        }

        await main();
    } catch (e) {
        await chat.reply(font.thin(e.message));
    }
};
