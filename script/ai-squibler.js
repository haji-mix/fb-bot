const axios = require('axios');

module.exports["config"] = {
        name: "squibler",
        aliases: ["aiwriter", "storygen", "genstory", "storymaker", "storyteller"],
        isPrefix: false,
        version: "1.0.0",
        credits: "Kenneth Panio",
        role: 0,
        type: "artificial-intelligence",
        info: "Generate stories using the Squibler AI.",
        usage: "[prompt]",
        guide: "squibler write a story about a hero's journey!",
        cd: 6
};

module.exports["run"] = async ({ chat, args, font }) => {
        let query = args.join(" ");
        
        if (event.type === "message_reply" && event.messageReply.body) {
    query += `\n\nUser replied mentioned about this message: ${event.messageReply.body}`;
}

        if (!query) {
                chat.react("⁉️");
                const resp = await chat.reply(font.italic("❔ | Please provide a prompt!"));
                resp.unsend(5000);
                return;
        }

        const url = 'https://www.squibler.io/squibler-api';
        const headers = {
                'Content-Type': 'application/json',
                'Accept': '*/*',
                'X-Requested-With': 'XMLHttpRequest',
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Infinix X669 Build/SP1A.210812.016; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.14 Mobile Safari/537.36',
                'Referer': 'https://www.squibler.io/ai-story-generator',
        };

        const data = {
                operationName: "AIGenereatedPrompt",
                query: `query AIGenereatedPrompt(
                $promptDescription: String!,
                $promptType:String!,
                $scriptFor:String!,
                $scriptLength:String!,
                $tone:String!,
                $creativityLevel:Int!,
                $narrativePerspective:String!,
                $genre:String!,
                $characterName:String!,
                $characterDescription:String!,
                $settingDescription:String!,
                ){
        homePageAiGeneratedResponseText(
                promptDescription: $promptDescription,
                promptType: $promptType,
                scriptFor: $scriptFor,
                scriptLength: $scriptLength,
                tone: $tone,
                creativityLevel: $creativityLevel,
                narrativePerspective: $narrativePerspective,
                genre: $genre,
                characterName: $characterName,
                characterDescription: $characterDescription,
                settingDescription: $settingDescription,
                )
        }`,
                variables: {
                        promptDescription: query,
                        promptType: "home_page",
                        scriptFor: "",
                        scriptLength: "long", // Adjust length if needed (e.g., "short, medium, long")
                        tone: "",
                        creativityLevel: 50, // Adjust creativity level if needed (1-100)
                        narrativePerspective: "",
                        genre: "",
                        characterName: "",
                        characterDescription: "",
                        settingDescription: "",
                }
        };

        let msg = await chat.reply(font.monospace("💬 | Generating story..."));

        try {
                const response = await axios.post(url, data, { headers });
                const story = response.data.data.homePageAiGeneratedResponseText.prompt_data[0].prompt;
                const line = "\n" + '━'.repeat(18) + "\n";
                 msg.edit(font.bold("📖 | Generated Story") + line + story + line);
        } catch (error) {
                 msg.edit(font.monospace(`Failed to generate story. Please try again later: ${error.message}`));
        }
};
