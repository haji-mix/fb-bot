importScripts('worker-javascript.js');

self.onmessage = function(e) {
  console.log('Message received from main script:', e.data);
  const result = `Worker received: ${e.data}`;
  self.postMessage(result);
};