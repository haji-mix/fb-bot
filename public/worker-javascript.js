// This script will be imported by the worker.js

console.log('worker-javascript.js has been loaded.');

// Example function to demonstrate functionality
function performTask() {
  return 'Task performed by worker-javascript.js';
}

// Allow worker.js to call this function
self.onmessage = function(e) {
  console.log('Message received from main script:', e.data);
  if (e.data === 'performTask') {
    const result = performTask();
    self.postMessage(result);
  }
};