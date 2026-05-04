using UnityEditor;
using UnityEngine;
using System.Linq;
using System;
using Koschei.Editor; // Baş Mimar'ın bulunduğu kütüphane

public class KoscheiBuilder
{
    public static void PreExport()
    {
        Debug.Log("[Koschei Ajanı] Ayarlar yapılıyor, Local Build devralacak...");

        // Sahne listesine müdahale etmiyoruz çünkü Baş Mimar (KoscheiSceneArchitect) zaten otonom sahneyi ayarladı.
        
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;
        EditorUserBuildSettings.buildAppBundle = true;

        string bundleId = Environment.GetEnvironmentVariable("KOSCHEI_BUNDLE_ID");
        string keystorePath = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PATH");
        string keystorePass = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PASS");
        string keyAlias = Environment.GetEnvironmentVariable("KOSCHEI_KEYALIAS");
        string keyPass = Environment.GetEnvironmentVariable("KOSCHEI_KEYPASS");

        if (!string.IsNullOrEmpty(bundleId)) PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, bundleId);

        if (!string.IsNullOrEmpty(keystorePath))
        {
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;
            Debug.Log("[Koschei Ajanı] Kullanıcıya özel Keystore ayarlandı.");
        }
    }

    public static void BuildAndroid()
    {
        Debug.Log("🏭 [Koschei Fabrikası] Üretim Bandı Çalıştırıldı!");

        // 1. ADIM: OTONOM MİMARİ İNŞAATI BAŞLAT (ZİNCİRLEME REAKSİYON)
        try
        {
            Debug.Log("🤖 [Koschei Fabrikası] Baş Mimar çağrılıyor, sahne koddan inşa edilecek...");
            KoscheiSceneArchitect.ConstructSceneFromCode();
        }
        catch (Exception ex)
        {
            Debug.LogError("💥 [Koschei Fabrikası] Sahne inşası sırasında kritik hata: " + ex.Message);
            throw; // Sahne dizilemezse müşteriye boş APK gitmemesi için işlemi iptal et
        }

        // 2. ADIM: DERLEME AYARLARINI (KEYSTORE VB.) YAP
        PreExport();

        // 3. ADIM: BAŞ MİMARIN DİZDİĞİ YEPYENİ SAHNEYİ AL
        string[] scenes = EditorBuildSettings.scenes.Where(sc => sc.enabled).Select(sc => sc.path).ToArray();
        
        if (scenes.Length == 0)
        {
            throw new Exception("Sahne listesi boş! Baş Mimar sahneyi Build listesine ekleyemedi.");
        }

        string outDir = "Builds/Android";
        System.IO.Directory.CreateDirectory(outDir);
        string output = Environment.GetEnvironmentVariable("KOSCHEI_OUTPUT_PATH");
        if (string.IsNullOrEmpty(output)) output = outDir + "/game.aab";

        // 4. ADIM: AAB PAKETİNİ DIŞARI BAS
        var report = BuildPipeline.BuildPlayer(new BuildPlayerOptions
        {
            scenes = scenes,
            locationPathName = output,
            target = BuildTarget.Android,
            options = BuildOptions.None
        });

        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
            throw new Exception("Android build failed: " + report.summary.result);

        Debug.Log("[Koschei Ajanı] Local Android build completed: " + output);
    }
}
