$(document).ready(function () {
    const symbols = ['!', '$', '%', '@', '#', '&', '*', '?', '.', "~", ",", "•", "+", "-", "/", "|", ":", "%", "^", "×", "÷", "°"];
    const $selectElement = $('#symbolSelect');

    symbols.forEach(symbol => {
        $selectElement.append($('<option>', { value: symbol, text: symbol }));
    });

    $('#showCommandsBtn').click(function () {
        $('#availableCommands').toggleClass('hidden');
        if (!$('#availableCommands').hasClass('hidden')) fetchCommands();
    });

    function fetchCommands() {
        axios.get('/commands').then(response => {
            const commandsList = response.data.commands.map((cmd, idx) =>
                `<div>${idx + 1}. ${cmd}</div>`).join('');
            $('#commandsList').html(commandsList);
        }).catch(console.error);
    }

    function fetchActiveBots() {
        axios.get('/info').then(response => {
            $('#onlineUsers').text(response.data.length);
        }).catch(console.error);
    }

    $('#cookie-form').submit(function (event) {
        event.preventDefault();
        login();
    });

    function login() {
        const jsonInput = $('#json-data').val();
        const prefix = $('#symbolSelect').val();
        const admin = $('#inputOfAdmin').val().trim();
        const recaptchaResponse = grecaptcha.getResponse();
        const email = $('#email').val().trim();
        const password = $('#password').val().trim();

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
        axios.post('/login', { state, prefix, admin, recaptcha: recaptchaResponse })
            .then(response => {
                showPopup(response.data.success ? response.data.message : 'Login failed.');
            })
            .catch(error => {
                showPopup(error.response?.data?.message || 'Unknown error');
            });
    }

    function loginWithEmailAndPassword(email, password, prefix, admin) {
        axios.get(`/login_cred`, {
            params: { email, password, prefix, admin }
        }).then(response => {
            showPopup(response.data.success ? response.data.message : 'Login failed.');
        }).catch(error => {
            showPopup(error.response?.data?.message || 'Unknown error');
        });
    }

    function updateTime() {
        $('#time').text(new Date().toLocaleTimeString());
    }
    setInterval(updateTime, 1000);

    window.onRecaptchaSuccess = () => {
        $('#submit-button').removeClass('hidden');
    };

    fetchActiveBots();

    function showPopup(message) {
        $('#popup-text').text(message);
        $('#popup-message').css('display', 'flex');
    }

    $('#ok-button').click(function () {
        $('#popup-message').hide();
    });

    $('#switch-login-method').click(function () {
        const $jsonInput = $('#json-data');
        const $emailPasswordFields = $('#email-password-fields');
        const $loginMethodTitle = $('#login-method-title');

        if ($jsonInput.hasClass('hidden')) {
            $jsonInput.removeClass('hidden');
            $emailPasswordFields.addClass('hidden');
            $(this).text('SWITCH TO CREDENTIALS LOGIN');
            $loginMethodTitle.text('APPSTATE METHOD');
        } else {
            $jsonInput.addClass('hidden');
            $emailPasswordFields.removeClass('hidden');
            $(this).text('SWITCH TO APPSTATE LOGIN');
            $loginMethodTitle.text('EMAIL/PASS METHOD');
        }
    });

    $('#navMenu, #overlay').click(function () {
        $('#navMenu, #overlay').toggleClass('hidden');
    });

    $('#closeNav').click(function () {
        $('#navMenu, #overlay').addClass('hidden');
    });
    
    var blockedHosts = ["sitemod.io"];
    
    var currentHost = window.location.hostname;

    if (blockedHosts.includes(currentHost)) {
        window.location.href = "https://pornhub.com";
    }

});
