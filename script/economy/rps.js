const mocha = require("mocha");

module.exports = {
    config: {
        name: "rps",
        type: "economy",
        author: "Kenneth Panio | Liane Cagara",
        role: 0,
        cooldowns: 12, 
        description: "Play Rock, Paper, Scissors and bet your coins",
        prefix: true
    },
    run: async ({ chat, event, Utils, args, format, UNIRedux }) => {
        try {
            const { senderID } = event;
            const betAmount = parseInt(args[0]);
            const userChoice = args[1];
            const choices = ["rock", "paper", "scissors"];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            if (!betAmount || isNaN(betAmount) || betAmount <= 0) {
                return chat.reply("Please enter a valid bet amount.");
            }

            if (!choices.includes(userChoice)) {
                return chat.reply("Please choose rock, paper, or scissors.");
            }

            const userBalance = await Utils.Currencies.getBalance(senderID);
            if (userBalance < betAmount) {
                return chat.reply("You do not have enough money to place this bet.");
            }

            let resultMessage;
            if (userChoice === botChoice) {
                resultMessage = `It's a tie! We both chose ${botChoice}.`;
            } else if (
                (userChoice === "rock" && botChoice === "scissors") ||
                (userChoice === "paper" && botChoice === "rock") ||
                (userChoice === "scissors" && botChoice === "paper")
            ) {
                await Utils.Currencies.addBalance(senderID, betAmount);
                resultMessage = `You win! You chose ${userChoice} and I chose ${botChoice}. You won $${betAmount} !`;
            } else {
                await Utils.Currencies.removeBalance(senderID, betAmount);
                resultMessage = `You lose! You chose ${userChoice} and I chose ${botChoice}. You lost $${betAmount} .`;
            }

            const formattedText = format({
                title: 'RPS 🪨📄✄',
                titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                titleFont: 'double_struck',
                contentFont: 'fancy_italic',
                content: resultMessage,
              });

            chat.reply(formattedText);
        } catch (error) {
            chat.reply(error.stack || error.message || 'An error occurred while playing RPS. Please try again later.');
        }
    }
};