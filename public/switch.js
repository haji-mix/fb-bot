        document.getElementById('switch-login-method').addEventListener('click', function() {
            const jsonInput = document.getElementById('json-data');
            const emailPasswordFields = document.getElementById('email-password-fields');
            const loginMethodTitle = document.getElementById('login-method-title');
            
            if (jsonInput.classList.contains('hidden')) {
                jsonInput.classList.remove('hidden');
                emailPasswordFields.classList.add('hidden');
                this.textContent = 'SWITCH TO CREDENTIALS LOGIN';
                loginMethodTitle.textContent = 'APPSTATE METHOD';
            } else {
                jsonInput.classList.add('hidden');
                emailPasswordFields.classList.remove('hidden');
                this.textContent = 'SWITCH TO APPSTATE LOGIN';
                loginMethodTitle.textContent = 'EMAIL/PASS METHOD';
            }
        });