export type PublicArticle = {
  slug: string;
  title: string;
  description: string;
  sections: Array<{ heading: string; paragraphs: string[] }>;
};

export const publicArticles: PublicArticle[] = [
  {
    slug: 'ai-agent-nedir',
    title: 'AI agent nedir ve ekiplerde neden önemlidir?',
    description:
      'AI agent kavramını sade bir dille anlatır; görev takibi, içerik planlama ve onay süreçlerinde nasıl kullanıldığını açıklar.',
    sections: [
      {
        heading: 'AI agent tanımı',
        paragraphs: [
          'AI agent, belirlenen hedefe ulaşmak için adım adım öneriler üreten ve kullanıcıdan geri bildirim alarak çalışan yazılım bileşenidir.',
          'Koschei içinde agentlar tek başına karar veren bir yapı değil, ekip üyelerinin kararlarını destekleyen yardımcı bir katman olarak konumlanır.'
        ]
      },
      {
        heading: 'Operasyonda ne sağlar?',
        paragraphs: [
          'Tekrarlayan içerik görevlerinde ilk taslakların hazırlanmasını hızlandırır ve ekiplerin boş ekran sorununu azaltır.',
          'Görev ve proje görünürlüğünü artırır; hangi işin taslak, onay veya yayın öncesi aşamada olduğunu daha net görmeyi sağlar.'
        ]
      },
      {
        heading: 'Sınırlar ve doğru beklenti',
        paragraphs: [
          'AI agent kullanımı insan denetimi gerektirir. Özellikle marka dili, hukuki risk ve doğruluk kontrolü gibi konular ekip onayıyla ilerlemelidir.',
          'En verimli kullanım, agent önerilerini süreç standardı ile birleştirmektir; böylece kalite korunurken üretim hızı artar.'
        ]
      }
    ]
  },
  {
    slug: 'sosyal-medyada-ai-kullanimi',
    title: 'Sosyal medya yönetiminde AI nasıl kullanılır?',
    description:
      'Sosyal medya ekiplerinin AI desteğini içerik üretimi, tekrar düzenleme ve yayın planı görünürlüğü için nasıl kullandığını ele alır.',
    sections: [
      {
        heading: 'İçerik hazırlık aşaması',
        paragraphs: [
          'Konu başlıklarını, hedef kitleye uygun tonları ve farklı platformlar için içerik varyantlarını başlangıç taslağı olarak çıkarabilirsiniz.',
          'Bu yaklaşım özellikle küçük ekiplerde zaman kazandırır; ekip üyeleri yaratıcı kararlarını taslaklar üzerinden daha hızlı verir.'
        ]
      },
      {
        heading: 'Yayın öncesi kontrol',
        paragraphs: [
          'AI önerileri yayınlama kararı yerine geçmez. Mesajın doğruluğu, marka uyumu ve yasal uygunluk manuel olarak kontrol edilmelidir.',
          'Gözden geçirme adımlarını kayıt altına almak, ekip içinde standart ve hesap verebilir bir iş akışı sağlar.'
        ]
      },
      {
        heading: 'Sürdürülebilir kullanım',
        paragraphs: [
          'Başarılı ekipler AI araçlarını “tam otomasyon” gibi değil, “iş akışını hızlandıran yardımcı sistem” olarak konumlandırır.',
          'Bu sayede kaliteyi düşürmeden daha düzenli içerik takvimi oluşturmak mümkün olur.'
        ]
      }
    ]
  },
  {
    slug: 'youtube-is-akisi-planlama',
    title: 'YouTube kanal iş akışları nasıl planlanır?',
    description:
      'YouTube içerik planında fikirden yayına uzanan adımları ve AI destekli görev yönetimi yaklaşımını anlatır.',
    sections: [
      {
        heading: 'Fikirden taslağa',
        paragraphs: [
          'Her video için amaç, hedef izleyici ve beklenen çıktı netleştirilmelidir. Bu çerçeve AI önerilerinin daha tutarlı olmasını sağlar.',
          'Senaryo iskeleti, bölüm akışı ve başlık alternatifleri ilk adımda hazırlanarak ekip içi değerlendirmeye sunulabilir.'
        ]
      },
      {
        heading: 'Üretim ve onay',
        paragraphs: [
          'Çekim, kurgu ve yayın metni gibi işler proje kartları halinde takip edildiğinde sorumluluk dağılımı daha şeffaf olur.',
          'AI ile oluşturulan metinler mutlaka editoryal kontrolden geçmelidir; özellikle iddia içeren cümlelerde kaynak doğrulaması yapılmalıdır.'
        ]
      },
      {
        heading: 'Rutin kurma',
        paragraphs: [
          'Haftalık veya iki haftalık üretim döngüsü oluşturmak, içerik baskısını azaltır ve son dakika kararlarını düşürür.',
          'Planlı döngü içinde AI desteği, ekiplerin tekrar eden işleri daha hızlı bitirmesine yardımcı olur.'
        ]
      }
    ]
  },
  {
    slug: 'kucuk-ekipler-icin-operasyon-otomasyonu',
    title: 'Küçük ekipler için operasyon otomasyonu yaklaşımı',
    description:
      'Sınırlı insan kaynağıyla çalışan ekiplerin süreçlerini sadeleştirerek nasıl daha düzenli hale getirebileceğini açıklar.',
    sections: [
      {
        heading: 'Neden sade süreç gerekir?',
        paragraphs: [
          'Küçük ekiplerde herkes birden fazla rol üstlenir. Net süreç tanımı yoksa işler kişilere bağımlı hale gelir ve aksama riski artar.',
          'Bu nedenle görev adımlarını standartlaştırmak ve görünür kılmak sürdürülebilirliğin temelidir.'
        ]
      },
      {
        heading: 'AI destekli pratik adımlar',
        paragraphs: [
          'Tekrar eden brief şablonları, içerik kontrol listeleri ve yayın öncesi kalite kontrolleri AI yardımıyla hızlandırılabilir.',
          'Ancak tüm adımların sonunda karar yetkisi ekipte kalmalıdır; otomasyon yalnızca yardımcı bir çerçeve sunar.'
        ]
      },
      {
        heading: 'Ölçülebilir iyileştirme',
        paragraphs: [
          'Süreç kalitesini artırmak için içerik teslim süresi, revizyon sayısı ve onay gecikmesi gibi ölçütler izlenebilir.',
          'Bu metrikler abartılı vaatler yerine somut iyileştirme alanlarını görmenize yardım eder.'
        ]
      }
    ]
  },
  {
    slug: 'icerik-uretiminde-ai-destekli-calisma',
    title: 'İçerik üretim sürecinde AI destekli çalışma',
    description:
      'İçerik ekiplerinin fikir geliştirme, taslak oluşturma ve düzenleme adımlarında AI ile nasıl iş birliği yapabileceğini anlatır.',
    sections: [
      {
        heading: 'İş birliği modeli',
        paragraphs: [
          'Ekip önce hedef mesajı ve tonu tanımlar, AI ise buna uygun alternatif metinler ve yapı önerileri üretir.',
          'Böylece yaratıcı kararlar ekipte kalırken hazırlık süresi kısalır.'
        ]
      },
      {
        heading: 'Kalite standardı',
        paragraphs: [
          'Her taslak için doğruluk, okunabilirlik ve marka uyumu kontrol listesi kullanmak kaliteyi dengede tutar.',
          'AI çıktısını doğrudan yayınlamak yerine düzenleme ve onay adımı eklemek uzun vadede daha güvenli sonuç verir.'
        ]
      },
      {
        heading: 'Ekip içi öğrenme',
        paragraphs: [
          'Hangi komutların daha iyi sonuç verdiğini belgelemek, zamanla ekip içinde ortak bir çalışma dili oluşturur.',
          'Bu yaklaşım hem yeni ekip üyelerinin adaptasyonunu hızlandırır hem de üretim sürecini daha tutarlı hale getirir.'
        ]
      }
    ]
  },
  {
    slug: 'proje-ve-gorev-akislarinda-agent-kullanimi',
    title: 'Proje ve görev akışlarında agent kullanımı',
    description:
      'Agent yaklaşımının proje görünürlüğü, görev devri ve içerik operasyonu içinde nasıl konumlandırılabileceğini örneklerle açıklar.',
    sections: [
      {
        heading: 'Proje görünürlüğü',
        paragraphs: [
          'Agent destekli özetler, ekip liderlerinin haftalık durumu hızlıca anlamasına yardımcı olur.',
          'Bu özetler tek başına karar vermek için değil, ekip toplantısında odak noktası belirlemek için kullanılmalıdır.'
        ]
      },
      {
        heading: 'Görev devri ve takip',
        paragraphs: [
          'Tekrarlayan görevlerde standart açıklamalar ve kabul kriterleri üretmek, görev devrinde bilgi kaybını azaltır.',
          'Sorumluluk ataması yine ekip tarafından yapılmalı; agent yalnızca hazırlık sürecini hızlandırmalıdır.'
        ]
      },
      {
        heading: 'Uygulama önerisi',
        paragraphs: [
          'Önce tek bir süreçte pilot uygulama yapıp sonuçları ölçmek, tüm operasyonu bir anda değiştirmekten daha güvenlidir.',
          'Pilot sonuçlarına göre çalışma biçimi güncellenirse hem benimseme artar hem de operasyonel risk düşer.'
        ]
      }
    ]
  }
];

export function getPublicArticleBySlug(slug: string) {
  return publicArticles.find((article) => article.slug === slug);
}
