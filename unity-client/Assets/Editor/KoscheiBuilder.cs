using UnityEditor;
using UnityEngine;
using System.Linq;
using System;

public class KoscheiBuilder
{
    // Koschei dışarıdan bu metodu tetikleyecek
    public static void BuildGame()
    {
        Debug.Log("[Koschei Ajanı] Sistem uyandı, derleme hazırlıkları başlıyor...");

        // 1. SAHNE AYARLARI (O meşhur hatayı kökünden çözen kısım)
        string[] scenes = EditorBuildSettings.scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        // Eğer kullanıcı sahne eklemeyi unuttuysa veya şablonsa, standart sahneyi zorla ekle
        if (scenes.Length == 0)
        {
            Debug.Log("[Koschei Ajanı] Sahne bulunamadı, varsayılan SampleScene ekleniyor.");
            scenes = new string[] { "Assets/Scenes/SampleScene.unity" };
        }

        // 2. GOOGLE PLAY STANDARTLARI (Kutucuk işaretleme devri bitti!)
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;
        EditorUserBuildSettings.buildAppBundle = true; // Bize AAB dosyası ver

        // 3. DİNAMİK KULLANICI AYARLARI (Railway'den gelecek veriler)
        string bundleId = Environment.GetEnvironmentVariable("KOSCHEI_BUNDLE_ID");
        string keystorePath = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PATH");
        string keystorePass = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PASS");
        string keyAlias = Environment.GetEnvironmentVariable("KOSCHEI_KEYALIAS");
        string keyPass = Environment.GetEnvironmentVariable("KOSCHEI_KEYPASS");

        // Gelen paket adı varsa uygula (örn: com.ahmet.mario)
        if (!string.IsNullOrEmpty(bundleId))
        {
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, bundleId);
        }

        // Gelen kullanıcıya özel bir keystore varsa şifreleri gir
        if (!string.IsNullOrEmpty(keystorePath))
        {
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;
            Debug.Log("[Koschei Ajanı] Kullanıcıya özel Keystore entegre edildi.");
        }

        // 4. DERLEMEYİ (BUILD) BAŞLAT
        BuildPlayerOptions buildPlayerOptions = new BuildPlayerOptions();
        buildPlayerOptions.scenes = scenes;
        buildPlayerOptions.locationPathName = "build/koschei-game.aab"; // Dosya buraya çıkacak
        buildPlayerOptions.target = BuildTarget.Android;
        buildPlayerOptions.options = BuildOptions.None;

        Debug.Log("[Koschei Ajanı] Motor ateşleniyor...");
        var report = BuildPipeline.BuildPlayer(buildPlayerOptions);

        // 5. SONUÇ RAPORU
        if (report.summary.result == UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            Debug.Log("[Koschei Ajanı] ZAFER! Derleme başarıyla tamamlandı.");
            EditorApplication.Exit(0); // Başarılı çıkış kodu
        }
        else
        {
            Debug.LogError("[Koschei Ajanı] HATA! Derleme başarısız oldu.");
            EditorApplication.Exit(1); // Hatalı çıkış kodu (Sistemi uyarır)
        }
    }
}
