module.exports = {
    config: {
        name: "shell",
        aliases: ["sh", "bash"],
        usage: '[command]',
        type: "utils",
        author: "Kenneth Panio",
        role: 3, 
        cooldowns: 10,
        description: "Execute a shell script with provided arguments!",
        prefix: true
    },
    run: async ({ chat, args, format, UNIRedux }) => {
        try {
            const commandString = args.join(" "); 
            if (!commandString) {
                return chat.reply(
                    format({
                        title: 'SHELL EXECUTION 🖥️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        titleFont: 'double_struck',
                        contentFont: 'fancy_italic',
                        content: 'Please provide a shell script name and arguments (e.g., shell lscpu).'
                    })
                );
            }

            const { exec } = require('child_process');

            exec(commandString, (error, stdout, stderr) => {
                if (error) {
                    return chat.reply(
                        format({
                            title: 'SHELL EXECUTION FAILED 🖥️',
                            titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                            titleFont: 'double_struck',
                            contentFont: 'fancy_italic',
                            content: `Error executing script: ${error.message}`
                        })
                    );
                }

                const output = stdout || stderr || 'No output from script.';
                chat.reply(
                    format({
                        title: 'SHELL EXECUTED 🖥️',
                        titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                        titleFont: 'double_struck',
                        contentFont: 'fancy_italic',
                        content: `Script executed successfully!\nOutput:\n${output}`
                    })
                );
            });

        } catch (error) {
            chat.reply(
                format({
                    title: 'SHELL EXECUTION ERROR 🖥️',
                    titlePattern: `{emojis} ${UNIRedux.arrow} {word}`,
                    titleFont: 'double_struck',
                    contentFont: 'fancy_italic',
                    content: error.message || 'An error occurred while executing the shell script.'
                })
            );
        }
    }
};