/**
 * Service Worker - 视觉赏析平台
 * 针对探索页 (/)、写真图集页 (/albums) 和每日图集页 (/daily-gallery) 优化缓存策略
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const PAGE_CACHE = `pages-${CACHE_VERSION}`;

// 预缓存的关键页面路由
const PRECACHE_ROUTES = ['/', '/albums', '/daily-gallery', '/discovery'];

// 静态资源缓存名称列表（用于版本更新时清理）
const ALL_CACHES = [STATIC_CACHE, IMAGE_CACHE, PAGE_CACHE];

// 图片缓存最大数量与过期时间
const IMAGE_CACHE_MAX = 200;
const IMAGE_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 天

// ——————————————————————————————————————
// Install：预缓存 App Shell 和关键路由
// ——————————————————————————————————————
self.addEventListener('install', (event) => {
  console.log('[SW] 安装中...', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll([
        '/',
        '/manifest.json',
        '/favicon.png',
      ]).catch((err) => {
        console.warn('[SW] 预缓存部分失败（忽略）:', err);
      });
    }).then(() => {
      // 跳过等待，立即激活新版本
      return self.skipWaiting();
    })
  );
});

// ——————————————————————————————————————
// Activate：清理旧版本缓存
// ——————————————————————————————————————
self.addEventListener('activate', (event) => {
  console.log('[SW] 激活中...', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => !ALL_CACHES.includes(name))
          .map((name) => {
            console.log('[SW] 删除旧缓存:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // 立即控制所有客户端
      return self.clients.claim();
    })
  );
});

// ——————————————————————————————————————
// Fetch：拦截请求并应用缓存策略
// ——————————————————————————————————————
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 仅处理 GET 请求
  if (request.method !== 'GET') return;

  // 跳过 chrome-extension、非 http(s) 协议
  if (!url.protocol.startsWith('http')) return;

  // 跳过 Supabase API 请求（实时数据，不缓存）
  if (url.hostname.includes('supabase.co') || url.hostname.includes('supabase.in')) return;

  // 跳过 Edge Function 调用
  if (url.pathname.startsWith('/functions/v1/')) return;

  // 1. 图片资源 → Cache First + 过期策略
  if (isImageRequest(request)) {
    event.respondWith(cacheFirstWithExpiry(request));
    return;
  }

  // 2. 静态资源 (JS/CSS/字体/svg) → Cache First（带 hash 的资源永久缓存）
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // 3. 关键页面路由 (/, /albums, /daily-gallery, /discovery) → Stale While Revalidate
  if (isKeyPage(url)) {
    event.respondWith(staleWhileRevalidate(request, PAGE_CACHE));
    return;
  }

  // 4. 其他同源 HTML 导航请求 → Network First (带离线回退)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }
});

// ——————————————————————————————————————
// 辅助判断函数
// ——————————————————————————————————————
function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'image' ||
    /\.(jpg|jpeg|png|gif|webp|avif|svg|ico)(\?.*)?$/i.test(url.pathname)
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/assets/') ||
    /\.(js|css|woff2?|ttf|eot)(\?.*)?$/i.test(url.pathname)
  );
}

function isKeyPage(url) {
  const pathname = url.pathname;
  return (
    pathname === '/' ||
    pathname === '/albums' ||
    pathname.startsWith('/albums/') ||
    pathname === '/daily-gallery' ||
    pathname === '/discovery'
  );
}

// ——————————————————————————————————————
// 缓存策略实现
// ——————————————————————————————————————

/**
 * Cache First：先从缓存读取，未命中则请求网络并缓存
 */
async function cacheFirst(request, cacheName = STATIC_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('离线状态，资源不可用', { status: 503 });
  }
}

/**
 * Cache First + 过期时间：图片专用，超期则重新请求
 */
async function cacheFirstWithExpiry(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const cached = await cache.match(request);

  if (cached) {
    // 检查是否过期
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate, 10);
      if (age < IMAGE_CACHE_MAX_AGE) {
        return cached;
      }
    } else {
      // 无时间戳则认为有效
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // 注入缓存时间戳
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));
      const modifiedResponse = new Response(await response.blob(), {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
      // 缓存前清理超量旧条目
      await trimImageCache(cache);
      cache.put(request, modifiedResponse.clone());
      return modifiedResponse;
    }
    return response;
  } catch {
    // 网络失败时尝试返回过期缓存
    if (cached) return cached;
    return new Response('', { status: 503 });
  }
}

/**
 * Stale While Revalidate：立即返回缓存，后台静默更新
 * 适合探索页/图集页/每日图集页：优先展示旧缓存保证速度，同时悄悄刷新
 */
async function staleWhileRevalidate(request, cacheName = PAGE_CACHE) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // 后台异步更新缓存
  const networkFetch = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);

  // 命中缓存则立即返回，否则等待网络响应
  return cached || await networkFetch || new Response('页面暂时不可用', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

/**
 * Network First + 离线回退：SPA 导航请求，优先网络，失败时回退到缓存的首页 shell
 */
async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // 离线时返回缓存的首页（SPA 路由由前端 React Router 接管）
    const cache = await caches.open(PAGE_CACHE);
    const fallback = await cache.match('/') ||
                     await caches.match('/');
    if (fallback) return fallback;
    return new Response('暂时无法访问，请检查网络连接', {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

/**
 * 清理图片缓存：删除最旧的条目，保持在 IMAGE_CACHE_MAX 以内
 */
async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length < IMAGE_CACHE_MAX) return;

  // 删除最旧的 20 条
  const toDelete = keys.slice(0, 20);
  await Promise.all(toDelete.map((key) => cache.delete(key)));
}

// ——————————————————————————————————————
// 消息通信：支持主线程控制 SW
// ——————————————————————————————————————
self.addEventListener('message', (event) => {
  const { type } = event.data || {};

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) =>
        Promise.all(names.map((name) => caches.delete(name)))
      ).then(() => {
        event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
      })
    );
  }

  if (type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ type: 'VERSION', version: CACHE_VERSION });
  }
});
