'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Rocket, Cpu, Sparkles } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase-browser';

/**
 * KOSCHEI V5 - Yeni Oyun Oluşturma Sayfası
 * Bu dosya Next.js build sürecinde "is not a module" hatasını çözmek için 
 * tertemiz bir şekilde yeniden oluşturulmuştur.
 */

export default function NewGamePage() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const handleCreateGame = async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      if (!supabase) {
        throw new Error('Veritabanı bağlantısı başlatılamadı.');
      }

      // 1. Üretim emrini veritabanına mühürle
      const { data, error: insertError } = await supabase
        .from('unity_build_jobs')
        .insert([{
          prompt: prompt,
          status: 'queued',
          project_name: 'Koschei_Autonomous_Project',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Başarılıysa dashboard'a sür
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Üretim hatası:', err);
      setError(err.message || 'Proje başlatılamadı. Lütfen tekrar deneyin.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium">
            <Sparkles size={14} />
            <span>Koschei Otonom Üretim Bandı v5</span>
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-500 bg-clip-text text-transparent">
            Yeni Bir Dünya İnşa Et
          </h1>
          <p className="text-slate-400 text-lg">
            Sadece ne hayal ettiğini yaz. Koschei kodları yazar, sahneyi dizer ve APK'yı fırından çıkarır.
          </p>
        </div>

        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-violet-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-slate-900/80 border border-white/10 p-2 rounded-3xl backdrop-blur-xl">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-xl p-6 min-h-[250px] placeholder:text-slate-600"
              placeholder="Örn: KOSCHEI V5: GTA PROTOKOLÜ... Şehirde geçen, arabaya binilebilen bir açık dünya oyunu yap."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleCreateGame}
          disabled={isGenerating || !prompt.trim()}
          className="w-full group relative flex items-center justify-center gap-3 bg-white text-black font-black text-xl py-6 rounded-2xl hover:bg-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          {isGenerating ? (
            <>
              <Cpu className="animate-spin" />
              <span>FABRİKA ÇALIŞIYOR...</span>
            </>
          ) : (
            <>
              <Rocket className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              <span>ÜRETİMİ BAŞLAT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


