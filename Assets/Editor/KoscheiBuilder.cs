using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

public class KoscheiBuilder
{
    #if UNITY_CLOUD_BUILD
    public static void PreExport(UnityEngine.CloudBuild.BuildManifestObject manifest)
    {
        var dict = manifest.ToDictionary();
        
        // Bundle ID ayarla
        if (dict.TryGetValue("bundleId", out object bundleObj) && bundleObj != null)
        {
            string newBundleId = bundleObj.ToString();
            PlayerSettings.applicationIdentifier = newBundleId;
            Debug.Log($"Bundle ID dinamik olarak değiştirildi: {newBundleId}");
        }
        else
        {
            Debug.LogWarning("Manifest içinde 'bundleId' bulunamadı.");
        }

        // Keystore ayarla
        if (dict.TryGetValue("keystoreName", out object ksObj) && ksObj != null)
        {
            PlayerSettings.Android.keystoreName = ksObj.ToString();
            
            if (dict.TryGetValue("keystorePass", out object ksPassObj) && ksPassObj != null)
                PlayerSettings.Android.keystorePass = ksPassObj.ToString();
                
            if (dict.TryGetValue("keyalias", out object aliasObj) && aliasObj != null)
                PlayerSettings.Android.keyaliasName = aliasObj.ToString();
                
            if (dict.TryGetValue("keyaliasPass", out object aliasPassObj) && aliasPassObj != null)
                PlayerSettings.Android.keyaliasPass = aliasPassObj.ToString();
                
            Debug.Log($"Keystore dinamik olarak ayarlandı: {PlayerSettings.Android.keystoreName}");
        }
        else
        {
            Debug.LogWarning("Manifest içinde 'keystoreName' bulunamadı.");
        }
    }
    #endif
}
