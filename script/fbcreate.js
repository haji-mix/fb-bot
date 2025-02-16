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
    usage: "[amount] [m]",
    isPrefix: true,
    type: "utilities",
    cd: 0,
  },
  async run({ api, event, args }) {
    try {
      const threadID = event.threadID;
      const senderID = event.senderID;
      const amount = parseInt(args[0], 10);
      const manualVerification = args[1]?.toLowerCase() === "m"; // Convert to lowercase for case-insensitive check

      if (isNaN(amount) || amount <= 0) {
        return api.sendMessage("Invalid number of accounts requested. Please specify a positive integer.", threadID);
      }

      api.sendMessage(`Creating ${amount} Facebook account(s)... Please wait.`, threadID);

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
          const password = genPass();
          const startTime = Date.now();
          const timeout = 5 * 60 * 1000; // 5 minutes timeout
          let success = false;

          while (Date.now() - startTime < timeout && !success) {
            const regData = await registerFacebookAccount(account.email, account.firstName, account.lastName, password, userAgent);
            if (regData && regData.new_user_id) {
              let code = null;
              if (manualVerification) {
                code = await getCodeWithRetry(account.email, timeout - (Date.now() - startTime)); // Fetch verification code with retry
                if (!code) {
                  console.error(`Failed to fetch verification code for ${account.email}`);
                }
              }
              accounts.push({
                email: account.email,
                firstName: account.firstName,
                lastName: account.lastName,
                password: password,
                userId: regData.new_user_id,
                token: regData.access_token || 'N/A',
                code: code || 'N/A', // Include verification code
              });
              success = true; // Mark as successful
            } else {
              console.error(`Registration failed for ${account.email}. Retrying...`);
              await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
            }
          }

          if (!success) {
            console.error(`Account creation timed out for ${account.email}`);
            accounts.push({ email: account.email, status: 'Account creation timed out' });
          }
        } else {
          console.error(`Email creation failed for account ${i + 1}`);
          accounts.push({ email: `Account ${i + 1}: Email creation failed`, status: 'Email creation failed' });
        }
        await new Promise(resolve => setTimeout(resolve, delayBetweenAccounts));
      }

      if (accounts.length > 0) {
        let resultMessage = `Account creation process finished:\n`;
        accounts.forEach((acc, index) => {
          if (acc.status) {
            resultMessage += `\n${index + 1}. ${acc.email} - ${acc.status}\n`;
          } else {
            resultMessage += `\n${index + 1}. ${acc.firstName} ${acc.lastName}\nUserID: ${acc.userId}\nEmail: ${acc.email}\nPassword: ${acc.password}\nToken: ${acc.token}\n`;
            if (manualVerification && acc.code !== 'N/A') {
              resultMessage += `Code: ${acc.code}\nPlease login manually to verify the email and use the code.\n`;
            } else {
              resultMessage += `Account is automatically verified.\n`;
            }
          }
        });
        api.sendMessage(resultMessage, threadID);
      } else {
        api.sendMessage("No accounts were created successfully.", threadID);
      }
    } catch (error) {
      console.error("Error in run function:", error);
      return api.sendMessage(`An error occurred: ${error.message}`, event.threadID);
    }
  },
};

async function getEmail() {
  try {
    const { data } = await axios.post(
      'https://api.tempmail.lol/v2/inbox/create',
      { domain: null },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Referer: 'https://tempmail.lol/en/',
        },
      }
    );
    return data.address; // Return the generated email address
  } catch (error) {
    console.error("Error in getEmail:", error);
    return null;
  }
}

async function getCodeWithRetry(email, timeout) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    try {
      const { data } = await axios.get(`https://api.tempmail.lol/v2/inbox?token=${email.split('@')[0]}`);
      if (data.emails && data.emails.length > 0) {
        const regex = /FB-(\d+)/;
        const match = regex.exec(data.emails[0].body);
        if (match) {
          return match[1]; // Return the verification code
        }
      }
    } catch (error) {
      console.error("Error in getCodeWithRetry:", error);
    }
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
  }
  return null; // Return null if no code is found within the timeout
}

async function getFakerData() {
  try {
    const response = await axios.get('https://randomuser.me/api/');
    const user = response.data.results[0];
    const firstName = user.name.first;
    const lastName = user.name.last;
    const email = await getEmail();
    return { firstName, lastName, email };
  } catch (error) {
    console.error("Error in getFakerData:", error);
    return null;
  }
}

const registerFacebookAccount = async (email, firstName, lastName, password, userAgent) => {
  const api_key = '882a8490361da98702bf97a021ddc14d';
  const secret = '62f8ce9f74b12f84c123cc23437a4a32';
  const gender = Math.random() < 0.5 ? 'M' : 'F';
  const birthday = generateRandomBirthday(1998, 2004);

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
    const response = await axios.post(api_url, new URLSearchParams(req), { headers: { 'User-Agent': userAgent } });
    const reg = response.data;
    console.log(`[✓] Registration Success for ${email}`);
    return reg;
  } catch (error) {
    console.error(`[!] Registration Error for ${email}: ${error}`);
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

// Helper function to generate a random password
function genPass() {
  const rand = Math.random().toString(36).slice(2, 8);
  const num = Math.floor(Math.random() * 1000);
  return `mita${rand}${num}`;
}

// Function to generate a random birthday between 1998 and 2004
function generateRandomBirthday(startYear, endYear) {
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12);
  const day = Math.floor(Math.random() * 28) + 1;
  return new Date(year, month, day);
}