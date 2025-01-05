module.exports["config"] = {
    name: "reka",
    aliases: ["yasa"],
    info: "chat with reka ai",
    usage: "[prompt]",
    isPrefix: false,
    credits: "Kenneth Panio",
    cd: 6,
    type: "chatbot",
}

module.exports["run"] = async ({ chat, font, args }) => {
    const reply = txt => {
        chat.reply(txt.replace(/\*\*(.*?)\*\*/g, (_, text) => font.bold(text)));
    }
    
    const prompt = args.join(" ");
    if (!prompt) return reply(font.thin("Please provide a message"));
    
    const answering = await chat.reply(mono("Generating response..."));
    
    try {
        const { post } = require("axios");

        const url = 'https://chat.reka.ai/api/chat';
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjlkbnNsSDdfZlJNNWRXNkFlc1piSiJ9.eyJpc3MiOiJodHRwczovL2F1dGgucmVrYS5haS8iLCJzdWIiOiJhdXRoMHw2Nzc5MjJhZGIwNTIzY2E4MTI0NGI3YjYiLCJhdWQiOlsiaHR0cHM6Ly9hcGkucmVrYS5haSIsImh0dHBzOi8vcHJvZHVjdGlvbi1yZWthLWFpLmV1LmF1dGgwLmNvbS91c2VyaW5mbyJdLCJpYXQiOjE3MzU5OTIwODYsImV4cCI6MTczNjA3ODQ4Niwic2NvcGUiOiJvcGVuaWQgcHJvZmlsZSBlbWFpbCBvZmZsaW5lX2FjY2VzcyIsImF6cCI6ImJhcTRRMThvU3NCaVdOd0RhTkM0bTVoZmdRR3dVdXBNIn0.KhqxqmLTRGC-4hvhIZgQK9BryGuxn0IM5k6QXjZgfCg7q2whv5QOtubiUKKqMPeii9HWeAiXi0NH0h33ap5bTLU4DQ4nqm61HsfzSvUu2mWWHd5kMarHNgzlSaDtOkYPkjtAMEsGgn4OWjYempAkTNdOVFcf3IbtIsbqxz0PjVwzLGVJ5k8ndqkOX6G86RQXw3qVoe1i2S9SbLjggrH4_sLCyrrlRlCbKg9TSoG4bti6And-pv2p-tZ1syaR7jkgictBlp_OA1H9_DBV27v9_bzZ_bdnYGwFCH95Ljp1rroxFhRJgd-VEiJFUp8rs_XEW7dwxaCIcv-MM4ldOfAdTA',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/132.0.6834.56 Mobile Safari/537.36',
            'Referer': 'https://chat.reka.ai/chat/DHhxJnM36J3VDQgwOAZS'
        };

        const body = {
            conversation_history: [{ type: "human", text: prompt }],
            stream: false,
            use_search_engine: true,
            use_code_interpreter: false,
            model_name: "reka-flash",
            random_seed: Date.now()
        };

        const response = await post(url, body, { headers });

        const replyText = response.data.text || "Sorry, I couldn't get a response.";

        const relevantChunks = Array.isArray(response.data.retrieved_chunks) ? 
            response.data.retrieved_chunks.filter(chunk => chunk.score >= 0.2) : [];

        if (relevantChunks.length > 0) {
            const importantChunks = relevantChunks.map(chunk => {
                return `**Source**: ${chunk.sourceDocument}\n**Text**: ${chunk.text}\n`;
            }).join("\n");

            reply(`**Browse Information**:\n\n${importantChunks}`);
        }
        
        answering.unsend();
        
        reply(replyText);

    } catch (error) {
        answering.unsend();
        reply(font.thin(error.message));
    }
}
