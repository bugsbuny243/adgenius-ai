using System.Collections.Generic;
using UnityEngine;

namespace Koschei.Generated
{
    public enum GameGenre { RPG, Strategy, Puzzle, EndlessRunner2D, Physics }
    public class KoscheiAutoSuite : MonoBehaviour
    {
        public GameGenre defaultGenre = GameGenre.EndlessRunner2D;
        public Transform player;

        private void Awake()
        {
            EnsureCoreSystems();
            RouteGenre(defaultGenre);
        }

        private void EnsureCoreSystems()
        {
            AttachIfMissing<ScoreSystem>("ScoreSystem");
            AttachIfMissing<EpisodeLevelSystem>("EpisodeLevelSystem");
            AttachIfMissing<KoscheiMonetization>("KoscheiMonetization");
            AttachIfMissing<KoscheiMultiplayerStub>("MultiplayerSystem");
            AttachIfMissing<KoscheiCharacterCatalog>("CharacterCatalog");
        }

        private void RouteGenre(GameGenre genre)
        {
            switch (genre)
            {
                case GameGenre.EndlessRunner2D: Build2DEndlessRunner(); break;
                case GameGenre.Physics: BuildPhysicsArena(); break;
                default: Build3DAdventureSkeleton(genre); break;
            }
        }

        private void Build2DEndlessRunner()
        {
            if (Camera.main != null)
            {
                Camera.main.orthographic = true;
                Camera.main.transform.position = new Vector3(0f, 1.5f, -10f);
            }

            var p = player != null ? player.gameObject : CreatePlayer2D();
            if (p.GetComponent<Rigidbody2D>() == null) p.AddComponent<Rigidbody2D>();
            if (p.GetComponent<BoxCollider2D>() == null) p.AddComponent<BoxCollider2D>();
            if (p.GetComponent<RunnerJumpController>() == null) p.AddComponent<RunnerJumpController>();

            var spawner = new GameObject("RunnerSpawner");
            spawner.AddComponent<RunnerLaneSpawner>();
        }

        private void BuildPhysicsArena()
        {
            var floor = GameObject.CreatePrimitive(PrimitiveType.Cube);
            floor.name = "PhysicsFloor";
            floor.transform.position = new Vector3(0f, -0.5f, 0f);
            floor.transform.localScale = new Vector3(40f, 1f, 12f);
            for (int i = 0; i < 10; i++)
            {
                var block = GameObject.CreatePrimitive(PrimitiveType.Cube);
                block.transform.position = new Vector3(10 + i * 2.5f, 1.0f + (i % 2), 0f);
                block.AddComponent<Rigidbody>();
            }
        }

        private void Build3DAdventureSkeleton(GameGenre genre)
        {
            var worldRoot = new GameObject($"{genre}WorldRoot");
            worldRoot.AddComponent<KoscheiGenreTag>().genre = genre;
            if (player == null)
            {
                var p = GameObject.CreatePrimitive(PrimitiveType.Capsule);
                p.name = "Player3D";
                p.transform.position = new Vector3(0f, 1f, 0f);
                p.AddComponent<Rigidbody>();
                player = p.transform;
            }
        }

        private GameObject CreatePlayer2D()
        {
            var p = new GameObject("RunnerPlayer");
            p.transform.position = new Vector3(-4f, 0f, 0f);
            p.AddComponent<SpriteRenderer>().color = Color.cyan;
            player = p.transform;
            return p;
        }

        private static void AttachIfMissing<T>(string name) where T : Component
        {
            var go = GameObject.Find(name) ?? new GameObject(name);
            if (go.GetComponent<T>() == null) go.AddComponent<T>();
        }
    }

    public class RunnerJumpController : MonoBehaviour
    {
        public float jumpForce = 9f;
        private Rigidbody2D rb;
        private bool grounded = true;
        private void Awake() => rb = GetComponent<Rigidbody2D>();
        private void Update()
        {
            transform.Translate(Vector3.right * (6f * Time.deltaTime));
            if ((Input.GetKeyDown(KeyCode.Space) || Input.touchCount > 0) && grounded)
            {
                rb.linearVelocity = new Vector2(rb.linearVelocity.x, jumpForce);
                grounded = false;
            }
        }
        private void OnCollisionEnter2D(Collision2D collision)
        {
            if (collision.collider.CompareTag("Ground") || collision.collider.name.Contains("Ground")) grounded = true;
            if (collision.collider.CompareTag("Obstacle")) FindAnyObjectByType<ScoreSystem>()?.ResetScore();
        }
        private void OnTriggerEnter2D(Collider2D other)
        {
            if (other.CompareTag("Coin"))
            {
                FindAnyObjectByType<ScoreSystem>()?.Add(1);
                Destroy(other.gameObject);
            }
        }
    }

    public class RunnerLaneSpawner : MonoBehaviour
    {
        private float spawnX = 8f;
        private void Start() => InvokeRepeating(nameof(SpawnChunk), 1f, 1.25f);
        private void SpawnChunk()
        {
            SpawnGround();
            if (Random.value > 0.45f) SpawnObstacle();
            if (Random.value > 0.55f) SpawnCoin();
        }
        private void SpawnGround()
        {
            var g = new GameObject("GroundChunk");
            g.tag = "Ground";
            g.AddComponent<BoxCollider2D>().size = new Vector2(6f, 1f);
            g.transform.position = new Vector3(spawnX, -1.6f, 0f);
            spawnX += 4f;
            Destroy(g, 12f);
        }
        private void SpawnObstacle()
        {
            var o = new GameObject("Obstacle");
            o.tag = "Obstacle";
            o.AddComponent<BoxCollider2D>().size = new Vector2(0.8f, 1.2f);
            o.transform.position = new Vector3(spawnX - 0.5f, -0.7f, 0f);
            Destroy(o, 12f);
        }
        private void SpawnCoin()
        {
            var c = new GameObject("Coin");
            c.tag = "Coin";
            c.AddComponent<CircleCollider2D>().isTrigger = true;
            c.transform.position = new Vector3(spawnX, Random.Range(-0.2f, 1.5f), 0f);
            Destroy(c, 12f);
        }
    }

    public class ScoreSystem : MonoBehaviour { public int score; public void Add(int v) => score += v; public void ResetScore() => score = 0; }
    public class EpisodeLevelSystem : MonoBehaviour { public int currentEpisode = 1; public int currentLevel = 1; public int levelsPerEpisode = 10; }
    public class KoscheiMonetization : MonoBehaviour { public bool adsEnabled = true; public bool iapEnabled = true; public List<string> productIds = new() { "coin_pack_small", "premium_pass", "no_ads" }; }
    public class KoscheiMultiplayerStub : MonoBehaviour { public int maxPlayers = 4; }
    public class KoscheiCharacterCatalog : MonoBehaviour { public List<string> characterIds = new() { "hero_knight", "hero_ninja", "hero_mage" }; }
    public class KoscheiGenreTag : MonoBehaviour { public GameGenre genre; }
}
