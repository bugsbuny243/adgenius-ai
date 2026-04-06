'use client';

import { useEffect } from 'react';

export function TemplateViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch(`/api/templates/${slug}/view`, {
      method: 'POST',
    });
  }, [slug]);

  return null;
}
