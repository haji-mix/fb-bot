document.addEventListener("DOMContentLoaded", function() {
    const showCommandsBtn = document.getElementById('showCommandsBtn');
    const availableCommands = document.getElementById('availableCommands');
    const submitButton = document.getElementById('submit-button');
    const resultDiv = document.getElementById('result');
    const onlineUsers = document.getElementById('onlineUsers'); // reference to active users element

    // CMD List toggle
    showCommandsBtn.addEventListener('click', () => {
        availableCommands.classList.toggle('hidden');
        if (!availableCommands.classList.contains('hidden')) fetchCommands();
    });

    // Fetch commands
    function fetchCommands() {
        axios.get('/commands')
            .then(response => {
                const commandsList = document.getElementById('commandsList');
                commandsList.innerHTML = response.data.commands.map((cmd, idx) =>
                    `<div>${idx + 1}. ${cmd}</div>`).join('');
            })
            .catch(console.error);
    }

    // Fetch active bots from /info
    function fetchActiveBots() {
        axios.get('/info')
            .then(response => {
                const activeBots = response.data;
                // Update the number of active bots
                onlineUsers.textContent = activeBots.length;
            })
            .catch(console.error);
    }

    // Handle form submission
    document.getElementById('cookie-form').addEventListener('submit', function(event) {
        event.preventDefault();
        login();
    });

    function login() {
        const jsonInput = document.getElementById('json-data').value;
        const prefix = document.getElementById('inputOfPrefix').value;
        const admin = document.getElementById('inputOfAdmin').value;
        const recaptchaResponse = grecaptcha.getResponse();

        if (!recaptchaResponse) {
            resultDiv.textContent = 'Please complete the CAPTCHA.';
            return;
        }

        try {
            const state = JSON.parse(jsonInput);
            axios.post('/login', { state, prefix, admin, recaptcha: recaptchaResponse })
                .then(response => {
                    resultDiv.textContent = response.data.success 
                        ? response.data.message 
                        : 'Login failed.';
                })
                .catch(error => {
                    if (error.response) {
                        resultDiv.textContent = error.response.data.message || 'Unknown error';
                    } else {
                        resultDiv.textContent = 'Network or connection issue occurred.';
                    }
                });
        } catch (error) {
            resultDiv.textContent = 'Invalid JSON input.';
        }
    }

    function updateTime() {
        document.getElementById('time').textContent = new Date().toLocaleTimeString();
    }
    setInterval(updateTime, 1000);

    // CAPTCHA success
    window.onRecaptchaSuccess = () => {
        submitButton.classList.remove('hidden'); // Show the submit button
    };

    // Initial fetch of active bots on page load
    fetchActiveBots();

    // Symbols dropdown population
    const symbols = ['!', '$', '%', '@', '#', '&', '*', '?', '.', "~", ",", "•", "+", "-", "/", "|", ":", "%", "^", "×", "÷", "°"];
    const selectElement = document.getElementById('symbolSelect');

    symbols.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = symbol;
        selectElement.appendChild(option);
    });
});
