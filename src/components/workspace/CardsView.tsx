import { useState, type ChangeEvent } from 'react';

type Card = { index: number; title: string; explanation: string; imageDataUrl: string };
type ChatTurn = { role: 'user' | 'assistant'; content: string };
type FeedItem =
  | { kind: 'user'; text: string }
  | { kind: 'card'; card: Card }
  | { kind: 'assistant'; text: string };

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

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Fotoğraf okunamadı.'));
    reader.readAsDataURL(file);
  });
}

function exportFeed(feed: FeedItem[]) {
  const body = feed.map((item) => {
    if (item.kind === 'user') {
      return `<p><strong>Soru:</strong> ${item.text}</p>`;
    }
    if (item.kind === 'assistant') {
      return `<p><strong>Öğretmen:</strong> ${item.text}</p>`;
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
  const [questionImage, setQuestionImage] = useState<File | null>(null);
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [cardsReady, setCardsReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apiBase() {
    return (window as { KARA_API_BASE_URL?: string }).KARA_API_BASE_URL || '';
  }

  // First message: generates the card sequence. Accepts a typed topic/
  // question and/or a question photo (transcribed to text on the backend).
  async function generate(text: string, imageFile: File | null) {
    setFeed((prev) => [...prev, { kind: 'user', text: text || '(fotoğraftan soru)' }]);
    try {
      const body: Record<string, unknown> = {};
      if (text) body.prompt = text;
      if (imageFile) {
        body.question_image = { mimeType: imageFile.type, data: await readFileAsDataUrl(imageFile) };
      }
      const response = await fetch(`${apiBase()}/api/cards/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) throw new Error(`Sunucu hatasi (${response.status})`);
      const batch: Card[] = [];
      for await (const event of readNdjson(response)) {
        if (event.type === 'card') {
          const card = event.card as Card;
          batch.push(card);
          setFeed((prev) => [...prev, { kind: 'card', card }]);
        } else if (event.type === 'error') {
          setError(event.message);
        }
      }
      if (batch.length) {
        setCards((prev) => [...prev, ...batch]);
        setCardsReady(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  // Follow-up messages once cards are on screen: a normal chat turn about
  // the cards just shown, same shape as ask-kara (question + history in,
  // answer text out) -- no new cards are generated here.
  async function askFollowUp(text: string) {
    setFeed((prev) => [...prev, { kind: 'user', text }]);
    const nextHistory = [...chatHistory, { role: 'user' as const, content: text }];
    setChatHistory(nextHistory);
    try {
      const response = await fetch(`${apiBase()}/api/cards/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, cards, history: nextHistory })
      });
      if (!response.ok) throw new Error(`Sunucu hatasi (${response.status})`);
      const data: { answer: string } = await response.json();
      setFeed((prev) => [...prev, { kind: 'assistant', text: data.answer }]);
      setChatHistory((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  }

  async function send() {
    const text = prompt.trim();
    if ((!text && !questionImage) || busy) return;
    setBusy(true);
    setError(null);
    setPrompt('');
    const imageFile = questionImage;
    setQuestionImage(null);
    if (cardsReady) {
      if (text) await askFollowUp(text);
    } else {
      await generate(text, imageFile);
    }
    setBusy(false);
  }

  function onPickImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    if (file && !file.type.startsWith('image/')) {
      setError('Lütfen bir fotoğraf dosyası seçin.');
      return;
    }
    setQuestionImage(file);
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
              Bir soru veya konu yaz, örn. &quot;ikinci dereceden denklemi çöz: x²-5x+6=0&quot; — kartlar sırayla
              üretilsin. İstersen soru metni yerine bir soru fotoğrafı da ekleyebilirsin.
            </p>
          )}
          {feed.map((item, i) => {
            if (item.kind === 'user') {
              return (
                <div key={i} style={{
                  alignSelf: 'flex-end', background: 'var(--primary)', color: 'var(--primary-text)',
                  padding: '8px 12px', borderRadius: 10, maxWidth: '85%', fontSize: 14
                }}
                >
                  {item.text}
                </div>
              );
            }
            if (item.kind === 'assistant') {
              return (
                <div key={i} style={{
                  alignSelf: 'flex-start', background: 'var(--surface-2)', color: 'var(--text)',
                  padding: '8px 12px', borderRadius: 10, maxWidth: '90%', fontSize: 14, lineHeight: 1.4
                }}
                >
                  {item.text}
                </div>
              );
            }
            return (
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
            );
          })}
          {busy && <div style={{ color: 'var(--muted)', fontSize: 13 }}>{cardsReady ? 'Cevap yazılıyor…' : 'Kart üretiliyor…'}</div>}
          {error && <div style={{ color: '#f87171', fontSize: 13 }}>{error}</div>}
        </div>

        {!cardsReady && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 13, color: 'var(--muted)' }}>
            <label className="iconTextButton" style={{ cursor: 'pointer' }}>
              Soru fotoğrafı ekle
              <input type="file" accept="image/*" onChange={onPickImage} style={{ display: 'none' }} />
            </label>
            {questionImage && (
              <>
                <span>{questionImage.name}</span>
                <button type="button" className="iconTextButton" onClick={() => setQuestionImage(null)}>
                  Kaldır
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') void send(); }}
            placeholder={cardsReady ? 'Kartlarla ilgili takip sorusu sor…' : 'Soru veya konu yaz…'}
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
