// Version 2.2.38 | 2026-05-19
// Service Worker ??P1: install fail correctly; P3a: skipWaiting 鉊?鉊冢? cache
// !! SYNC: 鉊?鉊冢?鉊腦鉊?鉊晤? APP_VERSION 鉆? script.js 鉊虜鉊?deploy
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
  self.skipWaiting(); // P3a: activate 鉊萵鉊?鉊?鉆腹鉆腦鉊?cache 鉆鉊芹腦鉆?
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache=>cache.addAll(CORE_ASSETS))
    // P1: 鉆腹鉆腹鉊?catch ??addAll fail ??install fail ??browser 鉆?鉆?SW 鉆鉊?鉊耜?鉆葉 (鉊艇鉊冢?鉊萵鉊?
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(
        keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k))
      ))
      .then(()=>self.clients.claim())
      .then(()=>self.clients.matchAll({type:'window',includeUncontrolled:false}))
      .then(clients=>Promise.all(
        clients.map(c=>{try{return c.navigate(c.url);}catch{return Promise.resolve();}})
      ))
      .catch(()=>{})
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  // Bypass cross-origin (fonts.googleapis.com, promptpay.io, etc.)
  if(url.origin!==location.origin)return;
  // Bypass version.json ??鉊?鉊冢?鉆?鉆?鉊耜? network 鉆鉊芹腹鉊?
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
