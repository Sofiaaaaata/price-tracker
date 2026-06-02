/* ═══════════════════════════════════════
   价格记录本 · Service Worker
   离线缓存 + 快速加载
   ═══════════════════════════════════════ */

const CACHE_NAME = 'price-tracker-v1';
const ASSETS = [
  './index.html',
  './manifest.json'
];

// ── 安装：预缓存核心文件 ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// ── 激活：清理旧缓存 ──
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// ── 请求拦截：缓存优先，网络兜底 ──
self.addEventListener('fetch', (event) => {
  // 跳过非 HTTP 请求和百度 OCR API（需要实时网络）
  if (!event.request.url.startsWith('http') ||
      event.request.url.includes('aip.baidubce.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      // 缓存命中 → 返回缓存，同时后台更新
      const fetchPromise = fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => null);

      return cached || fetchPromise;
    })
  );
});
