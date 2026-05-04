using UnityEngine;

// Koschei V5 - Test AI Script'i
public class AIGeneratedController : MonoBehaviour
{
    private Material mat;
    private float bounceSpeed = 5f;
    private float bounceHeight = 2f;

    void Start()
    {
        Debug.Log("🤖 [AI Controller] Yapay zeka kodu karaktere başarıyla enjekte edildi ve çalışıyor!");
        
        // Karakterin rengini Neon Cyan (Açık Mavi) yapalım
        mat = GetComponent<Renderer>().material;
        mat.color = new Color(0f, 1f, 1f); 
    }

    void Update()
    {
        // Kendi etrafında dönme hareketi
        transform.Rotate(Vector3.up, 100f * Time.deltaTime);

        // Yukarı aşağı zıplama hareketi
        float newY = Mathf.Sin(Time.time * bounceSpeed) * bounceHeight + 3f;
        transform.position = new Vector3(transform.position.x, newY, transform.position.z);
    }
}
