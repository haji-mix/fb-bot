particlesJS.load('particles-js', 'particles.json', function() {
      console.log('Particles.js configuration loaded successfully.');
    });
    
        function resizeParticles() {
        const particlesContainer = document.getElementById('particles-js');
        particlesContainer.style.height = document.body.scrollHeight + 'px';
    }

    window.addEventListener('load', resizeParticles);
    window.addEventListener('resize', resizeParticles);