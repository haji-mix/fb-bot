document.addEventListener("DOMContentLoaded", function () {
    const showCommandsBtn = document.getElementById('showCommandsBtn');
    const availableCommands = document.getElementById('availableCommands');
    const submitButton = document.getElementById('submit-button');
    const onlineUsers = document.getElementById('onlineUsers');
    const symbols = ['!', '$', '%', '@', '#', '&', '*', '?', '.', "~", ",", "•", "+", "-", "/", "|", ":", "%", "^", "×", "÷", "°"];
    const selectElement = document.getElementById('symbolSelect');

    symbols.forEach(symbol => {
        const option = document.createElement('option');
        option.value = symbol;
        option.textContent = symbol;
        selectElement.appendChild(option);
    });

    showCommandsBtn.addEventListener('click', () => {
        availableCommands.classList.toggle('hidden');
        if (!availableCommands.classList.contains('hidden')) fetchCommands();
    });

    function fetchCommands() {
        axios.get('/commands').then(response => {
            const commandsList = document.getElementById('commandsList');
            commandsList.innerHTML = response.data.commands.map((cmd, idx) =>
                `<div>${idx + 1}. ${cmd}</div>`).join('');
        }).catch(console.error);
    }

    function fetchActiveBots() {
        axios.get('/info').then(response => {
            const activeBots = response.data;
            onlineUsers.textContent = activeBots.length;
        }).catch(console.error);
    }

    document.getElementById('cookie-form').addEventListener('submit', function (event) {
        event.preventDefault();
        login();
    });

    function login() {
        const jsonInput = document.getElementById('json-data').value;
        const prefix = document.getElementById('symbolSelect').value;
        const admin = document.getElementById('inputOfAdmin').value.trim();
        const recaptchaResponse = grecaptcha.getResponse();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!recaptchaResponse) {
            showPopup('Please complete the CAPTCHA.');
            return;
        }

        try {
            const state = JSON.parse(jsonInput);
            
            if (state) {
                loginWithState(state, prefix, admin, recaptchaResponse);
            } else if (email && password) {
                loginWithEmailAndPassword(email, password, prefix, admin);
            } else {
                showPopup('Missing Appstate or Email and Password!');
            }
        } catch (error) {
            if (email && password) {
                loginWithEmailAndPassword(email, password, prefix, admin);
            } else {
                showPopup('Invalid Appstate JSON and Missing Email and Password!');
            }
        }
    }

    function loginWithState(state, prefix, admin, recaptchaResponse) {
        axios.post('/login', {
            state, prefix, admin, recaptcha: recaptchaResponse
        })
            .then(response => {
                showPopup(response.data.success ? response.data.message : 'Login failed.');
            })
            .catch(error => {
                if (error.response) {
                    showPopup(`${error.response.data.message || 'Unknown error'}`);
                } else {
                    showPopup('Network or connection issue occurred.');
                }
            });
    }

    function loginWithEmailAndPassword(email, password, prefix, admin) {
        axios.get(`/login_cred?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&prefix=${encodeURIComponent(prefix)}&admin=${encodeURIComponent(admin)}`)
            .then(response => {
                showPopup(response.data.success ? response.data.message : 'Login failed.');
            })
            .catch(error => {
                if (error.response) {
                    showPopup(`${error.response.data.message || 'Unknown error'}`);
                } else {
                    showPopup('Network or connection issue occurred.');
                }
            });
    }

    function updateTime() {
        document.getElementById('time').textContent = new Date().toLocaleTimeString();
    }
    setInterval(updateTime, 1000);

    window.onRecaptchaSuccess = () => {
        submitButton.classList.remove('hidden');
    };

    fetchActiveBots();

    function showPopup(message) {
        const popup = document.getElementById('popup-message');
        const popupText = document.getElementById('popup-text');
        popupText.textContent = message;
        popup.style.display = 'flex';
    }

    document.getElementById('ok-button').addEventListener('click', () => {
        const popup = document.getElementById('popup-message');
        popup.style.display = 'none';
    });
});