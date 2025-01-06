    const tracks = [
    './washingh.mp3',
    './suzume.mp3',
    './bye.mp3'
];

// Function to play random music
function playRandomMusic() {
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer.src !== randomTrack) {
        audioPlayer.src = randomTrack;
    }
    if (audioPlayer.paused) {
        audioPlayer.play();
    }
}

// Show popup message when page loads
window.onload = function() {
    const popupMessage = document.getElementById('popup-message');
    const okButton = document.getElementById('ok-button');

    // Display the message (use flex to center and show the popup)
    popupMessage.style.display = 'flex';

    // Add click event to OK button
    okButton.addEventListener('click', function() {
        // Hide the popup message
        popupMessage.style.display = 'none';
    // Play a random song if no music is already playing
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer.paused) {
        playRandomMusic();
    }
});

// Ensure that the audio continues playing without interruption when clicking on any element
document.addEventListener('click', function(event) {
    const audioPlayer = document.getElementById('audio-player');
    if (audioPlayer.paused) {
        playRandomMusic();
    }
}, true);

function playRandomMusic() {
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const audioPlayer = document.getElementById('audio-player');
    audioPlayer.src = randomTrack;
    audioPlayer.play();
}
};