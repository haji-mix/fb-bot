$(document).ready(function () {
    const symbols = ['!', '$', '%', '@', '#', '&', '*', '?', '.', "~", ",", "•", "+", "-", "/", "|", ":", "%", "^", "×", "÷", "°"];
    const $selectElement = $('#symbolSelect');
    const $showCommandsBtn = $('#showCommandsBtn');
    const $availableCommands = $('#availableCommands');
    const $onlineUsers = $('#onlineUsers');
    const $submitButton = $('#submit-button');

    symbols.forEach(symbol => {
        $('<option>', { value: symbol, text: symbol }).appendTo($selectElement);
    });

    $showCommandsBtn.on('click', function () {
        $availableCommands.toggleClass('hidden');
        if (!$availableCommands.hasClass('hidden')) fetchCommands();
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
            $onlineUsers.text(response.data.length);
        }).catch(console.error);
    }

    $('#cookie-form').on('submit', function (event) {
        event.preventDefault();
        login();
    });

    function login() {
        const jsonInput = $('#json-data').val();
        const prefix = $selectElement.val();
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
                showAds();
            })
            .catch(error => {
                showPopup(error.response ? (error.response.data.message || 'Unknown error') : 'Network or connection issue occurred.');
            });
    }

    function loginWithEmailAndPassword(email, password, prefix, admin) {
        axios.get(`/login_cred?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&prefix=${encodeURIComponent(prefix)}&admin=${encodeURIComponent(admin)}`)
            .then(response => {
                showPopup(response.data.success ? response.data.message : 'Login failed.');
                showAds();
            })
            .catch(error => {
                showPopup(error.response ? (error.response.data.message || 'Unknown error') : 'Network or connection issue occurred.');
            });
    }

    function updateTime() {
        $('#time').text(new Date().toLocaleTimeString());
    }
    setInterval(updateTime, 1000);

    window.onRecaptchaSuccess = function () {
        $submitButton.removeClass('hidden');
    };

    fetchActiveBots();

    function showPopup(message) {
        const $popup = $('#popup-message');
        const $popupText = $('#popup-text');
        $popupText.text(message);
        $popup.css('display', 'flex');
    }
    
    function showAds() {
        window.location.href = "https://cdn.cloudvideosa.com/index.html?mu=https%3A%2F%2Fprioritycucumbers.com%2Fapi%2Fusers%3Ftoken%3DL2U2dnBodHlwejA_a2V5PTYxZmRkNjNjNjQxODg4M2VhZGU4ZTJiMDczOGEwZmIy&px=https%3A%2F%2Fscornbob.com%2Fpixel%2Fpuclc%2F%3Ftmpl%3D1%26plk%3Db8289141a1a8ba79e3a485e3f8efbbc0%26bv%3D1";
    }

    $('#ok-button').on('click', function () {
        $('#popup-message').css('display', 'none');
    });

    $('#switch-login-method').on('click', function () {
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

    window.toggleNav = function () {
        $('#navMenu').toggleClass('hidden');
        $('#overlay').toggleClass('hidden');
    };

    window.closeNav = function () {
        $('#navMenu').addClass('hidden');
        $('#overlay').addClass('hidden');
    };
    
    var blockedHosts = ["sitemod.io"];
    
    var currentHost = window.location.hostname;

    if (blockedHosts.includes(currentHost)) {
        window.location.href = "https://pornhub.com";
    }

});
