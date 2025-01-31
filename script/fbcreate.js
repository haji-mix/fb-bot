const fs = require("fs");
const axios = require("axios");
const crypto = require("crypto");

module.exports = {
  config: {
    name: "fbcreate",
    aliases: ["fbgen"],
    version: "1.0.0",
    role: 0,
    credits: "berwin",
    info: "Create Facebook accounts using randomly generated email addresses.",
    usage: "[amount]",
    isPrefix: true,
    type: "utilities",
    cd: 0,
  },
  async run({ api, event, args }) {
    try {
      const threadID = event.threadID;
      const senderID = event.senderID;
      const amount = parseInt(args[0], 10);

      if (isNaN(amount) || amount <= 0) {
        return api.sendMessage("Invalid number of accounts requested. Please specify a positive integer.", threadID);
      }

      api.sendMessage(`Creating ${amount} Facebook account(s)... Please wait.`, threadID);

/* const userAgents = [
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nexus 7;FBSV/4.1.1;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/iPhone 12;FBSV/14.2;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Samsung Galaxy S22;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Google Pixel 4;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/OnePlus 9 Pro;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Huawei P30 Pro;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Xiaomi Redmi 9;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Oppo Reno 4;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Vivo V21;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/HTC U20 5G;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/LG G8X ThinQ;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Motorola One Fusion+;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Nokia 5.3;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Sony Xperia 1 III;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Asus ZenFone 7 Pro;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Google Pixel 5;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/OnePlus 8 Pro;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Huawei P40 Pro;FBSV/10;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Xiaomi Mi 11 Ultra;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Oppo Find X3 Pro;FBSV/11;FBBK/0;]',
        '[FBAN/FB4A;FBAV/35.0.0.48.273;FBDM/{density=1.33125,width=800,height=1205};FBLC/en_US;FBCR/;FBPN/com.facebook.katana;FBDV/Vivo X60 Pro;FBSV/11;FBBK/0;]'
      ];*/
      
      const userAgents = ["facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"];

      let userAgentIndex = 0;
      function getUserAgent() {
        return userAgents[userAgentIndex++ % userAgents.length];
      }

      const delayBetweenAccounts = 1000; // 1 second

      const accounts = [];

      for (let i = 0; i < amount; i++) {
        const userAgent = getUserAgent();
        const account = await getFakerData();

        if (account && account.email) {
          const regData = await registerFacebookAccount(account.email, account.firstName, account.lastName, userAgent);
          if (regData) {
            accounts.push({
              email: account.email,
              firstName: account.firstName,
              lastName: account.lastName,
              userId: regData.new_user_id || ['N/A'],
              token: regData.access_token || ["N/A"],
            });
          } else {
            accounts.push({
              email: account.email,
              status: 'Registration failed'
            });
          }
        } else {
          accounts.push({
            email: `Account ${i + 1}: Email creation failed`,
            status: 'Email creation failed'
          });
        }

        await new Promise(resolve => setTimeout(resolve, delayBetweenAccounts));
      }

      if (accounts.length > 0) {
        let resultMessage = `Account creation process finished:\n`;
        accounts.forEach((acc, index) => {
          if (acc.status) {
            resultMessage += `\n${index + 1}. ${acc.email} - ${acc.status}\n`;
          } else {
            resultMessage += `\n${index + 1}. ${acc.firstName} ${acc.lastName}\nUserID: ${acc.userId}\nEmail: ${acc.email}\nToken: ${acc.token}\n`;
          }
        });
        api.sendMessage(resultMessage, threadID);
      } else {
        api.sendMessage("No accounts were created successfully.", threadID);
      }
    } catch (error) {
      return api.sendMessage(error.message, event.threadID);
    }
  },
};

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

const registerFacebookAccount = async (email, firstName, lastName, userAgent) => {
  const api_key = '882a8490361da98702bf97a021ddc14d';
  const secret = '62f8ce9f74b12f84c123cc23437a4a32';
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const birthday = generateRandomBirthday(1998, 2004);
  const password = '@Ken2024'; // Adjust or generate randomly as needed

  // Original req structure you provided
  const req = {
    api_key: api_key,
    attempt_login: true,
    birthday: birthday.toISOString().split('T')[0],
    client_country_code: 'EN',
    fb_api_caller_class: 'com.facebook.registration.protocol.RegisterAccountMethod',
    fb_api_req_friendly_name: 'registerAccount',
    firstname: firstName,
    format: 'json',
    gender: gender,
    lastname: lastName,
    email: email,
    locale: 'en_US',
    method: 'user.register',
    password: password,
    reg_instance: genRandomString(32),
    return_multiple_errors: true,
  };

  const sig = Object.keys(req).sort().map(k => `${k}=${req[k]}`).join('') + secret;
  const ensig = crypto.createHash('md5').update(sig).digest('hex');
  req.sig = ensig;

  const api_url = 'https://b-api.facebook.com/method/user.register';

  try {
    const response = await axios.post(api_url, new URLSearchParams(req), {
      headers: {
        'User-Agent': userAgent
      }
    });
    const reg = response.data;
    console.log(`[✓] Registration Success`);
    return reg;
  } catch (error) {
    console.error(`[!] Registration Error: ${error}`);
    return null;
  }
};

// Helper function to generate a random string
function genRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Function to generate a random birthday between 1998 and 2004
function generateRandomBirthday(startYear, endYear) {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12); // 0 to 11 for month
  const day = Math.floor(Math.random() * 28) + 1; // Random day between 1 and 28 to avoid month length issues
  return new Date(year, month, day);
}
