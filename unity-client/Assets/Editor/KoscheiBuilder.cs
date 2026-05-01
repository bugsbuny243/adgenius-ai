using UnityEditor;
using UnityEngine;
using System.Linq;
using System;

public class KoscheiBuilder
{
    // Unity Cloud Build derlemeye başlamadan hemen önce bu metodu çağıracak
    public static void PreExport()
    {
        Debug.Log("[Koschei Ajanı] Ayarlar yapılıyor, Cloud Build devralacak...");

        // 1. SAHNE AYARLARI (Sahne hatasını çözen koruma)
        string[] scenes = EditorBuildSettings.scenes
            .Where(s => s.enabled)
            .Select(s => s.path)
            .ToArray();

        // Eğer sahne yoksa, varsayılan sahneyi zorla ekle
        if (scenes.Length == 0)
        {
            Debug.Log("[Koschei Ajanı] Sahne bulunamadı, varsayılan SampleScene ekleniyor.");
            EditorBuildSettings.scenes = new EditorBuildSettingsScene[] {
                new EditorBuildSettingsScene("Assets/Scenes/SampleScene.unity", true)
            };
        }

        // 2. GOOGLE PLAY STANDARTLARI (AAB, 64-bit, IL2CPP)
        PlayerSettings.SetScriptingBackend(BuildTargetGroup.Android, ScriptingImplementation.IL2CPP);
        PlayerSettings.Android.targetArchitectures = AndroidArchitecture.ARMv7 | AndroidArchitecture.ARM64;
        EditorUserBuildSettings.buildAppBundle = true; 

        // 3. DİNAMİK KULLANICI AYARLARI (Railway API'den gelecek şifreler)
        string bundleId = Environment.GetEnvironmentVariable("KOSCHEI_BUNDLE_ID");
        string keystorePath = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PATH");
        string keystorePass = Environment.GetEnvironmentVariable("KOSCHEI_KEYSTORE_PASS");
        string keyAlias = Environment.GetEnvironmentVariable("KOSCHEI_KEYALIAS");
        string keyPass = Environment.GetEnvironmentVariable("KOSCHEI_KEYPASS");

        if (!string.IsNullOrEmpty(bundleId))
        {
            PlayerSettings.SetApplicationIdentifier(BuildTargetGroup.Android, bundleId);
        }

        if (!string.IsNullOrEmpty(keystorePath))
        {
            PlayerSettings.Android.useCustomKeystore = true;
            PlayerSettings.Android.keystoreName = keystorePath;
            PlayerSettings.Android.keystorePass = keystorePass;
            PlayerSettings.Android.keyaliasName = keyAlias;
            PlayerSettings.Android.keyaliasPass = keyPass;
            Debug.Log("[Koschei Ajanı] Kullanıcıya özel Keystore ayarlandı.");
        }

        Debug.Log("[Koschei Ajanı] Görev tamam! Motoru kapatmıyorum, derlemeyi Cloud Build'e bırakıyorum.");
        
        // DİKKAT: BuildPlayer ve Exit(0) komutlarını sildik! 
        // Artık Unity kapanmayacak ve Cloud Build işini yapıp o klasörü dolduracak.
    }
}
