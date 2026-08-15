import { useEffect, useMemo, useState } from 'react';

type CatalogEntry = {
  id: string;
  title: string;
  topic: string | null;
  createdAt: string;
  updatedAt: string;
  durationSeconds: number | null;
  posterUrl: string | null;
};

type CatalogTab = 'public' | 'private';

function apiBase() {
  return (window as { KARA_API_BASE_URL?: string }).KARA_API_BASE_URL || '';
}

function formatDuration(seconds: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function groupByTopic(entries: CatalogEntry[]) {
  const rows: { key: string; label: string; items: CatalogEntry[] }[] = [];
  if (entries.length) {
    rows.push({ key: '__recent', label: 'Yeni Eklenenler', items: entries.slice(0, 12) });
  }
  const byTopic = new Map<string, CatalogEntry[]>();
  for (const entry of entries) {
    const topic = (entry.topic || '').trim() || 'Diğer';
    if (!byTopic.has(topic)) byTopic.set(topic, []);
    byTopic.get(topic)!.push(entry);
  }
  for (const [topic, items] of byTopic) {
    rows.push({ key: topic, label: topic, items });
  }
  return rows;
}

export function KatalogView() {
  const [tab, setTab] = useState<CatalogTab>('public');
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playback, setPlayback] = useState<{ title: string; url: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const base = apiBase();
        const path = tab === 'public' ? '/api/catalog' : '/api/catalog/mine';
        const headers: Record<string, string> = {};
        if (tab === 'private') {
          const token = window.KARA_AUTH?.getAccessToken();
          if (!token) throw new Error('Özel dersleri görmek için giriş yapmalısın.');
          headers.Authorization = `Bearer ${token}`;
        }
        const response = await fetch(`${base}${path}`, { headers });
        if (!response.ok) throw new Error(`Katalog yüklenemedi (${response.status})`);
        const data = await response.json();
        if (!cancelled) setEntries(data.lessons || []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [tab]);

  const rows = useMemo(() => groupByTopic(entries), [entries]);
  const hero = entries[0] || null;

  async function openLesson(entry: CatalogEntry) {
    try {
      const base = apiBase();
      const headers: Record<string, string> = {};
      const path = tab === 'public'
        ? `/api/catalog/${encodeURIComponent(entry.id)}/video-url`
        : `/api/lessons/${encodeURIComponent(entry.id)}/video-url`;
      if (tab === 'private') {
        const token = window.KARA_AUTH?.getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch(`${base}${path}`, { headers });
      if (!response.ok) throw new Error(`Video açılamadı (${response.status})`);
      const data = await response.json();
      if (!data.videoUrl) throw new Error('Bu ders için video bulunamadı.');
      setPlayback({ title: entry.title, url: data.videoUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  return (
    <section className="placeholderView katalogView hidden" id="katalogView" style={{ alignItems: 'stretch', padding: 0, minHeight: '100vh' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
      <div className="katalogTabs">
        <button
          type="button"
          className={`katalogTabBtn${tab === 'public' ? ' active' : ''}`}
          onClick={() => setTab('public')}
        >
          Herkese Açık
        </button>
        <button
          type="button"
          className={`katalogTabBtn${tab === 'private' ? ' active' : ''}`}
          onClick={() => setTab('private')}
        >
          Derslerim
        </button>
      </div>

      {loading && <div className="katalogStatus">Katalog yükleniyor…</div>}
      {error && <div className="katalogStatus katalogError">{error}</div>}
      {!loading && !error && entries.length === 0 && (
        <div className="katalogStatus">
          {tab === 'public' ? 'Henüz herkese açık ders yok.' : 'Henüz kendi dersin yok.'}
        </div>
      )}

      {hero && (
        <div
          className="katalogHero"
          style={hero.posterUrl ? { backgroundImage: `url(${hero.posterUrl})` } : undefined}
        >
          <div className="katalogHeroOverlay">
            <div className="katalogHeroTopic">{hero.topic || 'Ders'}</div>
            <h1 className="katalogHeroTitle">{hero.title}</h1>
            <button type="button" className="katalogPlayBtn" onClick={() => void openLesson(hero)}>
              ▶ İzle
            </button>
          </div>
        </div>
      )}

      <div className="katalogRows">
        {rows.map((row) => (
          <div key={row.key} className="katalogRow">
            <div className="katalogRowLabel">{row.label}</div>
            <div className="katalogRowTrack">
              {row.items.map((entry) => (
                <button
                  type="button"
                  key={`${row.key}-${entry.id}`}
                  className="katalogCard"
                  onClick={() => void openLesson(entry)}
                >
                  <div
                    className="katalogCardPoster"
                    style={entry.posterUrl ? { backgroundImage: `url(${entry.posterUrl})` } : undefined}
                  >
                    {!entry.posterUrl && <span className="katalogCardPosterFallback">{entry.title.slice(0, 1)}</span>}
                    {formatDuration(entry.durationSeconds) && (
                      <span className="katalogCardDuration">{formatDuration(entry.durationSeconds)}</span>
                    )}
                  </div>
                  <div className="katalogCardTitle">{entry.title}</div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      </div>

      {playback && (
        <div className="katalogPlayerOverlay" onClick={() => setPlayback(null)}>
          <div className="katalogPlayerCard" onClick={(event) => event.stopPropagation()}>
            <div className="katalogPlayerHeader">
              <strong>{playback.title}</strong>
              <button type="button" className="katalogPlayerClose" onClick={() => setPlayback(null)} aria-label="Kapat">✕</button>
            </div>
            <video src={playback.url} controls autoPlay style={{ width: '100%', display: 'block' }} />
          </div>
        </div>
      )}
    </section>
  );
}
