# Unity Client

This directory contains the Unity project files in one place.

## Included Unity folders

- `Assets/`
- `ProjectSettings/`

## Notes

- Keep Unity-specific files under `unity-client/` to avoid scattering Unity project content across the repository root.

## Unity build scene fallback (GitHub method)

If Unity Cloud Build (or a remote automation agent) cannot see the startup scene, make sure this file exists and is committed:

- `unity-client/ProjectSettings/EditorBuildSettings.asset`

Then ensure `m_Scenes` includes your playable scene path (for example `Assets/Scenes/Main.unity` or your actual scene file). Unity reads this file to determine which scenes are added to Build Settings in headless/CI builds.
