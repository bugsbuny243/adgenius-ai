'use client';

import { useRef } from 'react';

export function PublishButton({ label = 'Yayınla' }: { label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input ref={inputRef} type="hidden" name="confirm_publish" defaultValue="no" />
      <button
        type="submit"
        onClick={(event) => {
          const ok = window.confirm('Kullanıcı onayı gerekli. Bu işlem seçili paketi yayın kanalına gönderecek. Devam etmek istiyor musunuz?');
          if (!ok) {
            event.preventDefault();
            if (inputRef.current) inputRef.current.value = 'no';
            return;
          }

          if (inputRef.current) inputRef.current.value = 'yes';
        }}
        className="rounded-lg bg-neon px-4 py-2 font-semibold text-ink"
      >
        {label}
      </button>
    </>
  );
}
