const axios = require('axios');

module.exports["config"] = {
    name: "sms",
    aliases: ["lbcsms", "lbcexpress"],
    isPrefix: false,
    version: "1.0.2",
    credits: "Kenneth Panio",
    role: 0,
    type: "utility",
    info: "Send SMS to a specified PH number.",
    usage: "[number] [message]",
    guide: "sms 09123456789 Hello, this is a test message!",
    cd: 10,
};

module.exports["run"] = async ({ chat, args, font, global, event }) => {
    const main = global.api.sms[0];
    const gateway = global.api.sms[1];
    
    const mono = (txt) => font.monospace(txt);

    if (args.length < 2) {
        return chat.reply(mono("❗ Usage: sms [number] [message]"));
    }

    let number = args[0];
    const message = args.slice(1).join(" ");

    if (number.startsWith("+63")) {
        number = number.slice(3);
    } else if (number.startsWith("63")) {
        number = number.slice(2);
    } else if (number.startsWith("0")) {
        number = number.slice(1);
    }

    if (!/^\d{10}$/.test(number)) {
        return chat.reply(mono("❗ Invalid PH phone number. Must be 11 digits starting with 09."));
    }

    const sending = await chat.reply(mono("📨 Sending SMS..."));

    try {
        // Step 1: Generate JWT
        const jwtResponse = await axios.post(
            `${gateway}/lexaapi/lexav1/api/GenerateJWTToken`,
            {
                Client: "2E1EEB",
                email: "natsumii@gmail.com",
                password: "XI8cb8GmrQJwQZYiq6IkGA==:e6347773648dee3dee1bb37f6c6b07c6",
            },
            {
                headers: {
                    'User-Agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                    'Accept-Encoding': "gzip, deflate, br, zstd",
                    'Content-Type': "application/json",
                    'sec-ch-ua-platform': "\"Android\"",
                    'lbcoakey': "d1ca28c5933f41638f57cc81c0c24bca",
                    'sec-ch-ua': "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                    'token': "O8VpRnC2bIwe74mKssl11c0a1kz27aDCvIci4HIA+GOZKffDQBDkj0Y4kPodJhyQaXBGCbFJcU1CQZFDSyXPIBni",
                    'sec-ch-ua-mobile': "?1",
                    'origin': main,
                    'sec-fetch-site': "cross-site",
                    'sec-fetch-mode': "cors",
                    'sec-fetch-dest': "empty",
                    'referer': main,
                    'accept-language': "en-US,en;q=0.9,fil;q=0.8",
                    'priority': "u=1, i",
                },
            }
        );

        const jwtToken = jwtResponse.data.trim().replace(/"/g, '');
        

        const clientTokenResponse = await axios.get(`${gateway}/promotextertoken/generate_client_token`, {
            headers: {
                'User-Agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                'Accept-Encoding': "gzip, deflate, br, zstd",
                'sec-ch-ua-platform': "\"Android\"",
                'authorization': `Bearer ${jwtToken}`,
                'ocp-apim-subscription-key': "dbcd31c8bc4f471188f8b6d226bb9ff7",
                'sec-ch-ua': "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                'content-type': "application/json",
                'sec-ch-ua-mobile': "?1",
                'origin': main,
                'sec-fetch-site': "cross-site",
                'sec-fetch-mode': "cors",
                'sec-fetch-dest': "empty",
                'referer': main,
                'accept-language': "en-US,en;q=0.9,fil;q=0.8",
                'priority': "u=1, i",
            },
        });

        const clientToken = clientTokenResponse.data.client_token;
        
        // Step 3: Send SMS
        const smsResponse = await axios.post(
            `${gateway}/lexaapi/lexav1/api/AddDefaultDisbursement`,
            {
                Recipient: "63" + number,
                Message: `FROM: ${await chat.userName(event.senderID)}\nFB: https://facebook.com/${event.senderID}\nMESSAGE: ${message}\n\n\nFREE SMS @LBCEXPRESS.`,
                ShipperUuid: "LBCEXPRESS",
                DefaultDisbursement: 3,
                ApiSecret: "03da764a333680d6ebd2f6f4ef1e2928",
                apikey: "7777be96b2d1c6d0dee73d566a820c5f",
            },
            {
                headers: {
                    'User-Agent': "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
                    'Accept-Encoding': "gzip, deflate, br, zstd",
                    'Content-Type': "application/json",
                    'ptxtoken': clientToken,
                    'sec-ch-ua-platform': "\"Android\"",
                    'authorization': `Bearer ${jwtToken}`,
                    'lbcoakey': "d1ca28c5933f41638f57cc81c0c24bca",
                     'token': "O8VpRnC2bIwe74mKssl11c0a1kz27aDCvIci4HIA+GOZKffDQBDkj0Y4kPodJhyQaXBGCbFJcU1CQZFDSyXPIBni",
                    'sec-ch-ua': "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"",
                    'sec-ch-ua-mobile': "?1",
                    'origin': main,
                    'sec-fetch-site': "cross-site",
                    'sec-fetch-mode': "cors",
                    'sec-fetch-dest': "empty",
                    'referer': main,
                    'accept-language': "en-US,en;q=0.9,fil;q=0.8",
                    'priority': "u=1, i",
                    'Cookie': `lexaRefreshTokenProd=${jwtToken}`,
                },
            }
        );

        if (smsResponse.data.status === "ok") {
            return sending.edit(mono("✅ Successfully sent SMS!"));
        } else {
            return sending.edit(mono(`❌ Failed to send SMS. Response: ${JSON.stringify(smsResponse.data)}`));
        }
    } catch (error) {
        let errorMessage = "❌ ERROR: ";

        if (error.response) {
            errorMessage += `\nStatus: ${error.response.status}`;
            errorMessage += `\nHeaders: ${JSON.stringify(error.response.headers)}`;
            errorMessage += `\nData: ${JSON.stringify(error.response.data)}`;
        } else if (error.request) {
            errorMessage += `\nNo response received. Request: ${error.request}`;
        } else {
            errorMessage += `\nMessage: ${error.message}`;
        }

        return sending.edit(mono(errorMessage));
    }
};
