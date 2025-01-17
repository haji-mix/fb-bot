const tracks = [
    './washingh.mp3',
    './suzume.mp3',
    './bye.mp3',
    'https://sf16-ies-music-va.tiktokcdn.com/obj/musically-maliva-obj/7309353473656769286.mp3',
    'https://sf16-ies-music-va.tiktokcdn.com/obj/musically-maliva-obj/7374389952207522566.mp3'
];

// Function to play random music
function playRandomMusic() {
    const randomTrack = tracks[Math.floor(Math.random() * tracks.length)];
    const audioPlayer = $('#audio-player').get(0); // Get the DOM element from jQuery object
    if (audioPlayer.src !== randomTrack) {
        audioPlayer.src = randomTrack;
    }
    if (audioPlayer.paused) {
        audioPlayer.play();
    }
}

// Show popup message when page loads
$(document).ready(function () {
    const $popupMessage = $('#popup-message');
    const $okButton = $('#ok-button');
    const $audioPlayer = $('#audio-player');

    // Display the message (use flex to center and show the popup)
    $popupMessage.css('display', 'flex');

    // Add click event to OK button
    $okButton.on('click', function () {
        // Hide the popup message
        $popupMessage.hide();

        // Play a random song if no music is already playing
        if ($audioPlayer.get(0).paused) {
            playRandomMusic();
        }
    });

    // Ensure that the audio continues playing without interruption when clicking on any element
    $(document).on('click', function (event) {
        if ($audioPlayer.get(0).paused) {
            playRandomMusic();
        }
    });
});
