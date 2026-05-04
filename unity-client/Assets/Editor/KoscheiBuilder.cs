using UnityEditor;
using UnityEngine;
using System.Linq;
using System;

public class KoscheiBuilder
{
    public static void PreExport()
    {
        Debug.Log("[Koschei Ajanı] Ayarlar yapılıyor, Local Build devralacak...");

        string[] scenes = EditorBuildSettings.scenes.Where(s => s.enabled).Select(s => s.path).ToArray();
        if (scenes.Length == 0)
        {
            Debug.Log("[Koschei Ajanı] Sahne bulunamadı, varsayılan SampleScene ekleniyor.");
            EditorBuildSettings.scenes = new EditorBuildSettingsScene[] {
                new EditorBuildSettingsScene("Assets/Scenes/SampleScene.unity", true)
            };
        }

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
        PreExport();
        string[] scenes = EditorBuildSettings.scenes.Where(sc => sc.enabled).Select(sc => sc.path).ToArray();
        string outDir = "Builds/Android";
        System.IO.Directory.CreateDirectory(outDir);
        string output = Environment.GetEnvironmentVariable("KOSCHEI_OUTPUT_PATH");
        if (string.IsNullOrEmpty(output)) output = outDir + "/game.aab";

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
