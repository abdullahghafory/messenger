# LAN Messenger APK — بازسازی بر پایه V4 نصب‌شده

این بسته، ساختار و فایل‌های اصلی نسخه `LAN-Messenger-Proxy-FIX-V4.zip` را حفظ می‌کند تا منطق WebView و پراکسی داخلی که در نسخهٔ نصب‌شده وجود داشت عوض نشود. اصلاح اصلی این بازسازی، آماده‌سازی روند ساخت خودکار است: GitHub Actions پکیج‌های Android SDK را نصب می‌کند و فایل‌های کامل Gradle Wrapper را می‌سازد، چون ZIP مبنا فایل‌های `gradle/wrapper` را نداشت.

## ساخت APK با گوشی از طریق GitHub

1. فایل ZIP را دانلود و استخراج کنید.
2. وارد مخزن GitHub خود شوید و از بخش **Add file → Upload files** فایل‌ها و پوشه‌های داخل ZIP را به ریشهٔ مخزن اضافه کنید. پوشهٔ `.github` هم باید در ریشه باشد.
3. اگر GitHub پرسید، تغییرات را با پیام `Rebuild from installable V4 base` روی شاخهٔ `main` ثبت کنید.
4. در مخزن، برگهٔ **Actions** را باز کنید.
5. گردش‌کار **Build LAN Messenger APK** را انتخاب کنید.
6. اگر اجرا خودکار شروع نشده بود، روی **Run workflow → Run workflow** بزنید.
7. اجرای تازه را باز کنید و منتظر سبز شدن همهٔ مراحل بمانید.
8. در پایین صفحهٔ اجرای موفق، بخش **Artifacts** را باز کنید و `LAN-Messenger-debug-apk` را دانلود کنید.
9. ZIP آرتیفکت را روی گوشی استخراج کنید و فایل `app-debug.apk` را باز و نصب کنید. اگر Android اجازه خواست، برای همان برنامهٔ مدیریت فایل یا مرورگر گزینهٔ **Install unknown apps / نصب برنامه‌های ناشناس** را فعال کنید.

## ساخت در Codespaces (اختیاری)

این روش فقط وقتی کار می‌کند که Java 17، Android SDK و Gradle در محیط Codespaces حاضر باشند. در ترمینال ریشهٔ پروژه اجرا کنید:

```bash
export ANDROID_HOME="${ANDROID_HOME:-$HOME/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin"
gradle --no-daemon wrapper --gradle-version 8.7 --distribution-type bin
chmod +x gradlew
./gradlew --no-daemon clean assembleDebug
```

اگر دستور `gradle` یا Android SDK نصب نیست، از روش GitHub Actions بالا استفاده کنید؛ workflow برای نصب SDK و تولید Wrapper طراحی شده است.

## نکتهٔ مهم

این پروژه یک اپ Android/WebView است که به سرور وب پیام‌رسان موجود در شبکه وصل می‌شود؛ خودش سرور PHP یا پایگاه دادهٔ MySQL را در گوشی نصب نمی‌کند. هنگام اجرا باید گوشی و سرور در شبکه‌ای باشند که به هم دسترسی دارند. آدرس و پورت را در صفحهٔ شروع برنامه وارد کنید.

این ZIP از نظر ساختار آرشیو بررسی شده است، اما APK در این محیط کامپایل یا روی گوشی آزمایش نشده است. موفقیت واقعی فقط وقتی تأیید می‌شود که GitHub Actions سبز شود و APK نصب و اتصال به سرور روی گوشی امتحان شود.
