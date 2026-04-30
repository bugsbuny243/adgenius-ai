using UnityEngine;
using UnityEditor;
using System.Collections.Generic;

public class KoscheiBuilder
{
    #if UNITY_CLOUD_BUILD
    public static void PreExport(UnityEngine.CloudBuild.BuildManifestObject manifest)
    {
        var dict = manifest.ToDictionary();
        
        if (dict.TryGetValue("bundleId", out object bundleObj))
        {
            PlayerSettings.applicationIdentifier = bundleObj.ToString();
        }
        
        if (dict.TryGetValue("keystoreName", out object ksObj))
        {
            PlayerSettings.Android.keystoreName = ksObj.ToString();
            PlayerSettings.Android.keystorePass = dict.GetValue("keystorePass")?.ToString();
            PlayerSettings.Android.keyaliasName = dict.GetValue("keyalias")?.ToString();
            PlayerSettings.Android.keyaliasPass = dict.GetValue("keyaliasPass")?.ToString();
        }
    }
    #endif
}
