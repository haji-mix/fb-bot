const axios = require('axios');
const EventSource = require('eventsource');

module.exports["config"] = {
        name: "gpt4e",
        aliases: ["gptl", "gpt4ol", "gpt4l"],
        info: "Free version of ChatGPT-4 from gpt4everyone.ai",
        usage: "[prompt]",
        credits: "Kenneth Panio",
        version: "1.2.5",
        isPrefix: false,
        cd: 5,
}

module.exports["run"] = async ({ chat, args, font }) => {
        var mono = txt => font.monospace(txt);
        const prompt = args.join(" ");
        
        if (!prompt) {
                return chat.reply(mono("Please kindly provide your message!"));
        }
        
        const answering = await chat.reply(mono("Generating response..."));
        
        try {
                
                let text = "";

                const res = await axios.post("https://gpt4everyone.ai/api.php",
                        new URLSearchParams({ message: prompt }),
                        {
                                headers: {
                                        'Accept': 'application/json, text/javascript, */*; q=0.01',
                                        'Accept-Language': 'pt-BR,pt;q=0.9',
                                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                                        'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
                                        'sec-ch-ua-mobile': '?0',
                                        'sec-ch-ua-platform': '"Windows"',
                                        'sec-fetch-dest': 'empty',
                                        'sec-fetch-mode': 'cors',
                                        'sec-fetch-site': 'same-origin',
                                        'sec-gpc': '1',
                                        'x-requested-with': 'XMLHttpRequest',
                                        'Cookie': 'PHPSESSID=gjv15og9cqep12kriuhi219cru',
                                        'Referer': 'https://gpt4everyone.ai/',
                                        'Referrer-Policy': 'strict-origin-when-cross-origin'
                                }
                        }
                );

                const eventSource = new EventSource('https://gpt4everyone.ai/api.php?action=retrieve', {
                        headers: {
                                'Accept': 'text/event-stream',
                                'Accept-Language': 'pt-BR,pt;q=0.9',
                                'Cache-Control': 'no-cache',
                                'sec-ch-ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
                                'sec-ch-ua-mobile': '?0',
                                'sec-ch-ua-platform': '"Windows"',
                                'sec-fetch-dest': 'empty',
                                'sec-fetch-mode': 'cors',
                                'sec-fetch-site': 'same-origin',
                                'sec-gpc': '1',
                                'Cookie': 'PHPSESSID=gjv15og9cqep12kriuhi219cru',
                                'Referer': 'https://gpt4everyone.ai/',
                                'Referrer-Policy': 'strict-origin-when-cross-origin'
                        }
                });

                eventSource.onmessage = function(event) {
                        try {
                                const data = JSON.parse(event.data);
                                const content = data.choices[0].delta.content;
                                if (content) {
                                        text += content;
                                }
                        } catch (error) {
                                if (event.data === '[DONE]') {
                                        eventSource.close();
                                        answering.unsend();
                                        chat.reply(text.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text)));
                                }
                        }
                };

                eventSource.onerror = function(error) {
                        eventSource.close();
                        answering.unsend();
                        chat.reply(mono("something went wrong with the server!"));
                };
        } catch (error) {
                answering.unsend();
                chat.reply(mono(error.message));
        }
};