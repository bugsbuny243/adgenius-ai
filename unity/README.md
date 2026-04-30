# Unity assets organization

Bu klasör, repodaki Unity ile ilgili dağınık dosyaları tek yerde toplar.

## Klasör yapısı

- `unity/scripts/`: Unity C# script şablonları (`*.cs.txt`).
- `unity/runtime-config/`: Oyun çalışma zamanı config JSON dosyaları.
- `unity/scenes/`: Sahne ve sahne meta dosyaları.
- `unity/settings/`: Unity proje ayar dosyaları.
- `unity/docs/`: Unity/Game Factory brief ve prompt dökümanları.
- `unity/templates/`: Unity template arşiv dosyaları.

## Bağlantılar (dosya referansları)

- `unity/scripts/KoscheiRunnerGame.cs.txt` dosyası `Assets/Koschei/Generated/koschei-game-config.json` yolunu bekler.
- `unity/scripts/KoscheiBuild.cs.txt` dosyası `Assets/Scenes/Main.unity` sahnesini build girdisi olarak kullanır.
- `unity/settings/EditorBuildSettings.asset.txt` dosyası da `Assets/Scenes/Main.unity` yoluna referans verir.

Not: Bu repo içinde Unity proje kökü (`Assets/`, `ProjectSettings/`) tam olarak bulunmadığı için dosyalar şablon/çıktı formatında (`*.txt`) tutuluyor.
