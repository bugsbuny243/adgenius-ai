using UnityEngine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine.SceneManagement;
using System.Reflection;
using System;
using System.IO;

namespace Koschei.Editor
{
    public class KoscheiSceneArchitect
    {
        // Bu metod, otonom derleme (Build) başlamadan hemen önce KoscheiBuilder tarafından çağrılacak.
        public static void ConstructSceneFromCode()
        {
            Debug.Log("🚨 [Koschei Architect] Otonom Sahne Üretimi Başlıyor...");

            // 1. Sıfırdan Bomboş Bir Sahne Yarat
            Scene newScene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            // 2. Işıklandırmayı Kur (Karanlıkta kalmayalım)
            GameObject lightGo = new GameObject("Directional Light");
            Light light = lightGo.AddComponent<Light>();
            light.type = LightType.Directional;
            lightGo.transform.rotation = Quaternion.Euler(50f, -30f, 0f);

            // 3. Ana Kamerayı Kur
            GameObject camGo = new GameObject("Main Camera");
            Camera cam = camGo.AddComponent<Camera>();
            camGo.tag = "MainCamera";
            camGo.transform.position = new Vector3(0, 5, -10);
            camGo.transform.rotation = Quaternion.Euler(20f, 0f, 0f);

            // 4. Zemin Yarat (Oyunun temeli)
            GameObject ground = GameObject.CreatePrimitive(PrimitiveType.Plane);
            ground.name = "Ground";
            ground.transform.localScale = new Vector3(10, 1, 10);
            ground.GetComponent<Renderer>().sharedMaterial.color = Color.gray;

            // 5. Oyuncu/Ana Karakteri Yarat
            GameObject player = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            player.name = "KoscheiPlayer";
            player.transform.position = new Vector3(0, 1, 0);

            // 6. YAPAY ZEKA KODUNU ENJEKTE ET (ASIL BÜYÜ BURADA)
            // Backend'deki LLM'in yazdığı ve projeye inen C# class'ını buluyoruz.
            // Standart olarak yapay zekaya kodun adını "AIGeneratedController" yaptıracağız.
            Type aiScriptType = FindType("AIGeneratedController");
            
            if (aiScriptType != null)
            {
                player.AddComponent(aiScriptType);
                Debug.Log("✅ [Koschei Architect] Yapay Zeka scripti başarıyla karaktere enjekte edildi!");
            }
            else
            {
                // Eğer yapay zeka kod basamamışsa veya kod hatalıysa çökmek yerine varsayılan fizik ekle
                Debug.LogWarning("⚠️ [Koschei Architect] AI scripti (AIGeneratedController) bulunamadı! Varsayılan fizik ekleniyor.");
                player.AddComponent<Rigidbody>();
            }

            // 7. Sahneyi Klasöre Kaydet
            string folderPath = "Assets/Koschei/Generated";
            if (!Directory.Exists(folderPath))
            {
                Directory.CreateDirectory(folderPath);
            }
            
            string scenePath = $"{folderPath}/GeneratedScene.unity";
            EditorSceneManager.SaveScene(newScene, scenePath);

            // 8. Bu yeni sahneyi Unity'nin "Build Settings" listesine 1. sıraya koy!
            EditorBuildSettingsScene[] buildScenes = new EditorBuildSettingsScene[1];
            buildScenes[0] = new EditorBuildSettingsScene(scenePath, true);
            EditorBuildSettings.scenes = buildScenes;

            Debug.Log($"🚀 [Koschei Architect] Sahne başarıyla inşa edildi ve derlemeye hazır: {scenePath}");
        }

        // Proje içindeki tüm C# dosyalarını tarayıp AI'ın yazdığı scripti bulan dedektif fonksiyon
        private static Type FindType(string typeName)
        {
            var type = Type.GetType(typeName);
            if (type != null) return type;
            
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                type = assembly.GetType(typeName);
                if (type != null) return type;
            }
            return null;
        }
    }
}
