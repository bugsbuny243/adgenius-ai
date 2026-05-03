using System;
using System.IO;
using System.Linq;
using UnityEditor;
using UnityEngine;

public static class LinuxDedicatedServerBuilder
{
    private const string DefaultOutputDir = "Builds/LinuxDedicatedServer";

    public static void BuildFromCli()
    {
        var outputDir = Environment.GetEnvironmentVariable("KOSCHEI_SERVER_BUILD_DIR");
        if (string.IsNullOrWhiteSpace(outputDir)) outputDir = DefaultOutputDir;

        BuildLinuxDedicatedServer(outputDir);
    }

    [MenuItem("Koschei/Build/Linux Dedicated Server")]
    public static void BuildFromMenu()
    {
        BuildLinuxDedicatedServer(DefaultOutputDir);
    }

    private static void BuildLinuxDedicatedServer(string outputDir)
    {
        var scenes = EditorBuildSettings.scenes.Where(scene => scene.enabled).Select(scene => scene.path).ToArray();
        if (scenes.Length == 0)
        {
            throw new BuildFailedException("No enabled scenes found for Linux dedicated server build.");
        }

        Directory.CreateDirectory(outputDir);
        var executableName = Environment.GetEnvironmentVariable("KOSCHEI_SERVER_BINARY_NAME");
        if (string.IsNullOrWhiteSpace(executableName)) executableName = "koschei-server.x86_64";

        var outputPath = Path.Combine(outputDir, executableName);
        var options = new BuildPlayerOptions
        {
            scenes = scenes,
            target = BuildTarget.StandaloneLinux64,
            subtarget = (int)StandaloneBuildSubtarget.Server,
            locationPathName = outputPath,
            options = BuildOptions.StrictMode
        };

        Debug.Log($"[Koschei Server Builder] Linux dedicated server build started: {outputPath}");
        var report = BuildPipeline.BuildPlayer(options);
        if (report.summary.result != UnityEditor.Build.Reporting.BuildResult.Succeeded)
        {
            throw new BuildFailedException($"Linux dedicated server build failed with result: {report.summary.result}");
        }

        Debug.Log($"[Koschei Server Builder] Build succeeded. Size: {report.summary.totalSize / (1024f * 1024f):F2} MB");
        Debug.Log("[Koschei Server Builder] Deploy these artifacts via Docker + Railway Service.");
    }
}
