# راهنمای نصب و ساخت

## GitHub Actions
- فایل‌های این پوشه را در ریشهٔ مخزن قرار دهید؛ خود پوشهٔ `lan_messenger...` را به عنوان زیرپوشه وارد نکنید.
- `.github/workflows/build-apk.yml` باید دقیقاً در مسیر `.github/workflows/build-apk.yml` مخزن باشد.
- سپس Actions → Build LAN Messenger APK → Run workflow را اجرا کنید.
- APK در Artifact با نام `LAN-Messenger-debug-apk` قرار می‌گیرد.

## خطاهای متداول
- اگر `gradlew: No such file or directory` دیدید، فایل‌ها را در ریشهٔ مخزن قرار نداده‌اید یا workflow جدید commit نشده است.
- اگر خطای SDK دیدید، بخش `Set up Android SDK` و `Verify Android SDK` را در log بررسی کنید.
- اگر نصب APK انجام شد ولی سرور باز نشد، گوشی و سرور باید روی یک شبکه قابل دسترسی باشند و IP/port درست باشد.
