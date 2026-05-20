// HORATAD:SW:3.0.2
// Version 3.0.2 | 2026-05-20
// Service Worker — cache-first for same-origin static assets, network fallback.
// Cross-origin requests (fonts, promptpay.io QR) bypass cache → live always.
// version.json bypass cache → ต้อง network สด เพื่อ version check
const CACHE_NAME='horatad-v3.0.2';
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
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE_ASSETS))
      .then(()=>self.skipWaiting())
      .catch(()=>{})
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Bypass cross-origin (fonts.googleapis.com, promptpay.io, etc.)
  if(url.origin!==location.origin)return;
  // Bypass version.json — ต้องสดเสมอ ไม่งั้น version check จะ false negative
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
