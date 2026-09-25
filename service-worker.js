// Change BUILD for every release. Install all assets before offering an update.
const BUILD='v8-20260925-1';
const PREFIX='drift-park:'+new URL(self.registration.scope).pathname+':';
const CACHE=PREFIX+BUILD;
const FILES=['./','index.html','game.js','physics.js','camera.js','rapier.js','input.js','particles.js','audio.js','map.js','pwa.js','style.css','manifest.webmanifest','icon-192.png','icon-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await cache.addAll(FILES.map(p=>new Request(new URL(p,self.registration.scope),{cache:'reload'})));}catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE')self.skipWaiting();});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url),scope=new URL(self.registration.scope);
  if(!(url.origin===scope.origin&&url.pathname.startsWith(scope.pathname)))return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate')return (await cache.match(new URL('index.html',scope).href))||fetch(event.request);const hit=await cache.match(event.request,{ignoreSearch:true});return hit||fetch(event.request);})());
});
