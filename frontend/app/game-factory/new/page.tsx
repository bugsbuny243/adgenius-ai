```react
'use client';

import { CheckCircle2, Cpu, Rocket, Sparkles, Wand2 } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

export default function NewGamePage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleCreate = async () => {
    if (!prompt) return;
    setIsGenerating(true);
    
    try {
      // Proje oluşturma mantığı burada tetikleniyor
      const { data, error } = await supabase
        .from('unity_build_jobs')
        .insert([{ 
          prompt: prompt, 
          status: 'queued',
          project_name: 'Koschei_GTA_Project' 
        }])
        .select();

      if (error) throw error;
      
      // Başarılıysa dashboard'a yönlendir
      router.push('/dashboard');
    } catch (err) {
      console.error("Proje oluşturma hatası:", err);
      // Hata mesajını kullanıcıya göster
      alert("Proje oluşturulamadı. Lütfen internet bağlantınızı ve yetkilerinizi kontrol edin.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-transparent">
            Yeni Oyun Fabrikası
          </h1>
          <p className="text-slate-400 text-lg">Konseptinizi yazın, Koschei otonom olarak inşa etsin.</p>
        </header>

        <section className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="KOSCHEI V5: GTA PROTOKOLÜ..."
            className="w-full bg-black/40 border border-slate-800 rounded-xl p-4 text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none min-h-[200px]"
          />
          
          <button
            onClick={handleCreate}
            disabled={isGenerating}
            className="mt-6 w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Cpu className="animate-spin" />
            ) : (
              <Rocket />
            )}
            {isGenerating ? "İnşa Ediliyor..." : "Oluştur"}
          </button>
        </section>
      </div>
    </main>
  );
}

```
