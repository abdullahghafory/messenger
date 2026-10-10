# LAN Messenger Proxy Fix V4

این نسخه بر پایه Proxy Test V3 است. مشکل `ERR_CONNECTION_REFUSED` روی `http://127.0.0.1:<port>/` اصلاح شده است.

## اصلاح اصلی
Proxy قبلی از `InetAddress.getLoopbackAddress()` استفاده می‌کرد. روی بعضی دستگاه‌ها این مقدار می‌تواند IPv6 یعنی `::1` باشد، در حالی که WebView به IPv4 یعنی `127.0.0.1` وصل می‌شد. در نتیجه اتصال داخلی با `ERR_CONNECTION_REFUSED` شکست می‌خورد.

در V4 Proxy صراحتاً روی `127.0.0.1` bind می‌شود. همچنین اگر Proxy متوقف شده باشد، Bridge آن را دوباره راه‌اندازی می‌کند.

این نسخه هنوز فقط برای تست Proxy است و PHP/DB داخلی ندارد.
