addEventListener('fetch', event => {
  event.respondWith(new Response('Hello from Node.js Cloudflare Workers!'));
});
