# Deep Linking

## Android
Tambahkan intent-filter di AndroidManifest.xml di dalam <activity>:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="www.bahasacerdas.com" />
    <data android:scheme="https" android:host="bahasacerdas.com" />
</intent-filter>
```

## Flutter
Gunakan package `app_links` untuk menangkap link dan load ke WebView.
