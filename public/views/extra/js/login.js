$(document).ready(function () {
    const symbols = ['!', '$', '%', '@', '#', '&', '*', '?', '.', "~", ",", "•", "+", "-", "/", "|", ":", "%", "^", "×", "÷", "°"];
    const $selectElement = $('#symbolSelect');
    const $showCommandsBtn = $('#showCommandsBtn');
    const $availableCommands = $('#availableCommands');
    const $onlineUsers = $('#onlineUsers');
    const $submitButton = $('#submit-button');

    symbols.forEach(symbol => {
        $('<option>', {
            value: symbol, text: symbol
        }).appendTo($selectElement);
    });

    let commandsFetched = false;
    $showCommandsBtn.on('click', function () {
        $availableCommands.toggleClass('hidden');
        if (!$availableCommands.hasClass('hidden') && !commandsFetched) {
            fetchCommands();
            commandsFetched = true;
        }
    });

    function fetchCommands() {
        $('#commandsLoading').removeClass('hidden');
        $('#commandsList').addClass('hidden');
        
        axios.get('/commands').then(response => {
            const commands = response.data.commands;
            const roles = response.data.roles;
            const aliases = response.data.aliases;
            
            let commandsHtml = '';
            commands.forEach((cmd, idx) => {
                const role = roles[idx] || 'user';
                const cmdAliases = aliases[idx] || [];
                const aliasText = cmdAliases.length > 0 ? cmdAliases.join(', ') : 'None';
                
                const roleColor = role === 'admin' ? 'text-red-400' : role === 'moderator' ? 'text-yellow-400' : 'text-green-400';
                const roleIcon = role === 'admin' ? 'fa-crown' : role === 'moderator' ? 'fa-shield-alt' : 'fa-user';
                
                commandsHtml += `
                    <div class="command-card p-4 rounded-lg">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-bold text-blue-400 flex items-center">
                                <i class="fas fa-terminal mr-2 text-sm"></i>${cmd}
                            </h4>
                            <span class="${roleColor} text-xs flex items-center">
                                <i class="fas ${roleIcon} mr-1"></i>${role}
                            </span>
                        </div>
                        <div class="text-sm text-gray-400">
                            <p><strong>Aliases:</strong> ${aliasText}</p>
                        </div>
                    </div>
                `;
            });
            
            $('#commandsList').html(commandsHtml).removeClass('hidden');
            $('#commandsLoading').addClass('hidden');
            $('#commandCount').text(commands.length);
        }).catch(error => {
            $('#commandsLoading').html(`
                <div class="text-center py-8">
                    <i class="fas fa-exclamation-triangle text-3xl text-red-400 mb-4"></i>
                    <p class="text-red-300">Failed to load commands</p>
                </div>
            `);
        });
    }

    function fetchActiveBots() {
        axios.get('/info').then(response => {
            $onlineUsers.text(response.data.length);
        }).catch(console.error);
    }

    // Fetch active bots every 10 seconds (or set your desired interval)
    setInterval(fetchActiveBots, 10000);

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
            showAlert('Please complete the CAPTCHA.', 'warning');
            return;
        }

        try {
            const state = JSON.parse(jsonInput);

            if (state) {
                loginWithState(state, prefix, admin, recaptchaResponse);
            } else if (email && password) {
                loginWithEmailAndPassword(email, password, prefix, admin);
            } else {
                showAlert('Missing Appstate or Email and Password!', 'question');
            }
        } catch (error) {
            if (email && password) {
                loginWithEmailAndPassword(email, password, prefix, admin);
            } else {
                showAlert('Invalid Appstate JSON or Invalid Email and Password!', 'error');
            }
        }
    }

    function loginWithState(state, prefix, admin, recaptchaResponse) {
        axios.post('/login', {
            state, prefix, admin, recaptcha: recaptchaResponse
        })
        .then(response => {
            if (response.data.success) {
                showAlert(response.data.message, "success");
            } else {
                showAlert(`Login failed something wen't wrong!.`, "error");
            }
          //  showAds();
        })
        .catch(error => {
            const errorMessage = error.response
            ? error.response.data.message || 'Unknown error': 'Network or connection issue occurred, please reload the page!';
            showAlert(errorMessage, "error");
        });
    }

    function loginWithEmailAndPassword(email, password, prefix, admin) {
        axios.get(`/login_cred?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&prefix=${encodeURIComponent(prefix)}&admin=${encodeURIComponent(admin)}`)
        .then(response => {
            if (response.data.success) {
                showAlert(response.data.message, "success");
            } else {
                showAlert(`Login failed something wen't wrong!.`, "error");
            }
           // showAds();
        })
        .catch(error => {
            const errorMessage = error.response
            ? error.response.data.message || 'Unknown error': 'Network or connection issue occurred, please reload the page!';
            showAlert(errorMessage, "error");
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

  /*  function showAds() {
        window.location.href = "";
    } */

    function showAlert(text, status) {
        Swal.fire({
            title: text,
            icon: status,
            confirmButtonColor: '#28a745'
        });
    }

    $('#ok-button').on('click', function () {
        $('#popup-message').css('display', 'none');
    });

    $('#switch-login-method').on('click', function () {
        const $jsonInput = $('#json-data-container');
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
