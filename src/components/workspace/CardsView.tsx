import { useState } from 'react';

type Card = { index: number; title: string; explanation: string; imageDataUrl: string };
type FeedItem = { kind: 'user'; text: string } | { kind: 'card'; card: Card };

async function* readNdjson(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.trim()) yield JSON.parse(line);
    }
  }
  if (buffer.trim()) yield JSON.parse(buffer);
}

function exportFeed(feed: FeedItem[]) {
  const body = feed.map((item) => {
    if (item.kind === 'user') {
      return `<p><strong>Soru:</strong> ${item.text}</p>`;
    }
    return `<div style="margin:16px 0"><h3>${item.card.title}</h3>
      <img src="${item.card.imageDataUrl}" style="max-width:480px;display:block;border-radius:8px" />
      <p>${item.card.explanation}</p></div>`;
  }).join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Kara Tahta - Kartlar</title></head>
    <body style="font-family:sans-serif;background:#0f1011;color:#f7f8f8;padding:24px">${body}</body></html>`;
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'karatahta-kartlar.html';
  a.click();
  URL.revokeObjectURL(url);
}

export function CardsView() {
  const [prompt, setPrompt] = useState('');
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = prompt.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setPrompt('');
    setFeed((prev) => [...prev, { kind: 'user', text }]);
    try {
      const base = (window as { KARA_API_BASE_URL?: string }).KARA_API_BASE_URL || '';
      const response = await fetch(`${base}/api/cards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text })
      });
      if (!response.ok) throw new Error(`Sunucu hatasi (${response.status})`);
      for await (const event of readNdjson(response)) {
        if (event.type === 'card') {
          setFeed((prev) => [...prev, { kind: 'card', card: event.card as Card }]);
        } else if (event.type === 'error') {
          setError(event.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="placeholderView hidden" id="cardView" style={{ alignItems: 'stretch', padding: 0, minHeight: '100vh' }}>
      <div style={{
        display: 'flex', flexDirection: 'column', width: '100%', height: '100%', maxWidth: 720, margin: '0 auto',
        padding: 16, boxSizing: 'border-box'
      }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Kart</strong>
          <button type="button" className="iconTextButton" disabled={feed.length === 0} onClick={() => exportFeed(feed)}>
            Sohbeti dışa aktar
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, padding: '8px 0' }}>
          {feed.length === 0 && (
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>
              Bir soru veya konu yaz, örn. &quot;ikinci dereceden denklemi çöz: x²-5x+6=0&quot; — kartlar sırayla üretilsin.
            </p>
          )}
          {feed.map((item, i) => item.kind === 'user' ? (
            <div key={i} style={{
              alignSelf: 'flex-end', background: 'var(--primary)', color: 'var(--primary-text)',
              padding: '8px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 14
            }}
            >
              {item.text}
            </div>
          ) : (
            <div key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
              overflow: 'hidden'
            }}
            >
              <img src={item.card.imageDataUrl} alt={item.card.title} style={{ width: '100%', display: 'block' }} />
              <div style={{ padding: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.card.title}</div>
                <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>{item.card.explanation}</div>
              </div>
            </div>
          ))}
          {busy && <div style={{ color: 'var(--muted)', fontSize: 13 }}>Kart üretiliyor…</div>}
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void send(); }}
            placeholder="Soru veya konu yaz…"
            style={{
              flex: 1, background: 'var(--surface-3)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '8px 10px', color: 'var(--text)'
            }}
          />
          <button type="button" onClick={() => void send()} disabled={busy} className="primaryAction">
            Gönder
          </button>
        </div>
      </div>
    </section>
  );
}
