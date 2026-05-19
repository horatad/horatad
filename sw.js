// Version 2.2.39 | 2026-05-19
// Service Worker — skipWaiting หลัง cache พร้อม, ไม่มี navigate reload
// !! SYNC: ต้องตรงกับ version.json ทุก deploy
const CACHE_NAME='horatad-v2.2.39';
const V=CACHE_NAME.split('-').pop();
const CORE_ASSETS=[
  './',
  './index.html?v='+V,
  './style.css?v='+V,
  './script.js?v='+V,
  './v3/engine.js?v='+V,
  './v3/interpretation.js?v='+V,
  './v3/typhoon.js?v='+V,
  './v3/v3tab.js?v='+V,
  './v3/kb.json?v='+V,
  './manifest.json',
  './horatad_128x128.png',
  './horatad_180x180.png',
  './horatad_192x192.png',
  './horatad_500x500.png',
  './horatad_512x512.png',
];

self.addEventListener('install',e=>{
  // skipWaiting หลัง addAll เสร็จ — cache พร้อมก่อน activate
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE_ASSETS))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
      .catch(()=>{})
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.endsWith('/version.json'))return;
  e.respondWith(
    caches.match(e.request).then(cached=>{
      if(cached)return cached;
      return fetch(e.request).then(resp=>{
        if(resp&&resp.status===200){
          const clone=resp.clone();
          caches.open(CACHE_NAME).then(c=>c.put(e.request,clone)).catch(()=>{});
        }
        return resp;
      }).catch(()=>caches.match('./index.html'));
    })
  );
});
