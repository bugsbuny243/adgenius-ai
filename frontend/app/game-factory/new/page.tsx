```react
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Cpu, Sparkles, ShieldAlert } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * KOSCHEI V5 - Temiz Üretim Bandı
 * 'project_name' hatası kesin olarak silindi.
 */

export default function NewGamePage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Supabase'i güvenli şekilde alıyoruz
  const supabase = createSupabaseBrowserClient();

  const handleCreate = async () => {
    if (!prompt.trim()) return;
    
    if (!supabase) {
      setError("Bağlantı hatası: Supabase istemcisi yüklenemedi.");
      return;
    }
    
    setIsGenerating(true);
    setError(null);

    try {
      // SADECE var olan sütunları gönderiyoruz
      const { error: dbError } = await supabase
        .from('unity_build_jobs')
        .insert([{
          prompt: prompt,
          status: 'queued'
        }]);

      if (dbError) throw dbError;

      // Başarılıysa dashboard'a yönlendir
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Üretim Başlatılamadı:', err);
      setError(err.message || "İşlem başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-8">
        
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles size={14} />
            Koschei Autonomous
          </div>
          <h1 className="text-6xl font-black tracking-tighter">ATEŞLE!</h1>
          <p className="text-slate-400">Oyunun ruhunu buraya dök, gerisini makineye bırak.</p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 to-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-slate-900 border border-white/10 rounded-3xl overflow-hidden">
            <textarea
              className="w-full h-64 bg-transparent p-8 text-xl text-white placeholder:text-slate-700 outline-none resize-none"
              placeholder="Örn: Açık dünya, Unity3D projesi..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-sm">
            <ShieldAlert size={18} />
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full bg-white text-black h-20 rounded-2xl font-black text-2xl flex items-center justify-center gap-4 hover:bg-cyan-400 transition-all disabled:opacity-30"
        >
          {isGenerating ? (
            <>
              <Cpu className="animate-spin" />
              <span>SİSTEM MEŞGUL...</span>
            </>
          ) : (
            <>
              <Rocket />
              <span>ÜRETİMİ BAŞLAT</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
}


```
