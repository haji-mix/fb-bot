fetch('alert.json')
.then(response => {
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    return response.json();
})
.then(data => {
    const updateMessage = `Update: ${data.update}\nFeatures: Commands and Optimization\n~${data.features.join('\n~')}\n\nAdded CMD: ~${data.cmd.join('\n~')}`;
    alert(updateMessage);
})
.catch(error => {
    console.error('There was a problem with the fetch operation:', error);
});