import { useEffect, useRef, useState } from 'react';

const suggestions = [
  ['Kuantum mekaniğini sezgisel olarak açıkla', 'Kuantum mekaniği'],
  ['Türev nedir, örneklerle anlat', 'Türev ve değişim'],
  ['Mitoz ve mayoz bölünme farkları', 'Mitoz ve mayoz'],
  ["Birinci Dünya Savaşı'nın nedenleri", 'I. Dünya Savaşı']
] as const;

const greetings = [
  'Bugün ne öğrenmek istersin?',
  'Ne öğrenmek istersin?',
  'Bugün hangi konuyu keşfedelim?',
  'Aklındaki konuyu anlat, başlayalım.',
  'Bugün neyi anlamak istersin?'
] as const;

function pickGreeting() {
  return greetings[Math.floor(Math.random() * greetings.length)];
}

const levelOptions = [
  { value: 'beginner', label: 'Başlangıç', desc: 'Temelden başlayan sade anlatım' },
  { value: 'intermediate', label: 'Orta', desc: 'Konuya aşina olanlar için' },
  { value: 'advanced', label: 'İleri', desc: 'Derinlemesine, hızlı anlatım' }
] as const;

const durationOptions = [
  { minutes: 2, segments: 4, label: '1-2 dk', desc: 'Hızlı özet' },
  { minutes: 10, segments: 20, label: '8-10 dk', desc: 'Standart ders' },
  { minutes: 18, segments: 36, label: '15-20 dk', desc: 'Detaylı ders' }
] as const;

type OpenMenu = 'level' | 'duration' | null;

export function HomeView() {
  const [greeting] = useState(pickGreeting);
  const [levelIdx, setLevelIdx] = useState(0);
  const [durationIdx, setDurationIdx] = useState(1);
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const pickerRowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (pickerRowRef.current && !pickerRowRef.current.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  return (
    <section className="homeView" id="homeView">
      <div className="heroCopy">
        <h1>{greeting}</h1>
      </div>

      <section className="promptComposer">
        <textarea id="topicInput" rows={3} placeholder="Bir konu yaz..." />

        <div className="composerBar">
          <div className="pickerRow" ref={pickerRowRef}>
            <div className="modelPicker">
              <button
                className="modelPickerTrigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={openMenu === 'level'}
                onClick={() => setOpenMenu((current) => (current === 'level' ? null : 'level'))}
              >
                {levelOptions[levelIdx].label}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className={`modelPickerMenu${openMenu === 'level' ? ' open' : ''}`} role="listbox" aria-label="Seviye">
                {levelOptions.map((option, index) => (
                  <button
                    key={option.value}
                    className={`optionPill modelPickerOption${index === levelIdx ? ' active' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={index === levelIdx}
                    data-level={option.value}
                    onClick={() => {
                      setLevelIdx(index);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="modelPickerOptionText">
                      <strong>{option.label}</strong>
                      <small>{option.desc}</small>
                    </span>
                    {index === levelIdx && (
                      <svg className="modelPickerCheck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="modelPicker">
              <button
                className="modelPickerTrigger"
                type="button"
                aria-haspopup="listbox"
                aria-expanded={openMenu === 'duration'}
                onClick={() => setOpenMenu((current) => (current === 'duration' ? null : 'duration'))}
              >
                {durationOptions[durationIdx].label}
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <div className={`modelPickerMenu${openMenu === 'duration' ? ' open' : ''}`} role="listbox" aria-label="Süre">
                {durationOptions.map((option, index) => (
                  <button
                    key={option.label}
                    className={`optionPill modelPickerOption${index === durationIdx ? ' active' : ''}`}
                    type="button"
                    role="option"
                    aria-selected={index === durationIdx}
                    data-minutes={option.minutes}
                    data-segments={option.segments}
                    onClick={() => {
                      setDurationIdx(index);
                      setOpenMenu(null);
                    }}
                  >
                    <span className="modelPickerOptionText">
                      <strong>{option.label}</strong>
                      <small>{option.desc}</small>
                    </span>
                    {index === durationIdx && (
                      <svg className="modelPickerCheck" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 13l4 4L19 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="composerActions">
            <label className="uploadButton" htmlFor="questionImageInput" title="Soru fotoğrafı ekle">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </label>
            <input id="questionImageInput" className="fileInput" type="file" accept="image/*" />
            <span id="questionImageName" className="uploadName hidden">PNG, JPG veya WebP</span>
            <button id="clearQuestionImageBtn" className="iconTextButton hidden" type="button" aria-label="Fotoğrafı kaldır">×</button>

            <button id="generatePlanBtn" className="generateAction" type="button" aria-label="Dersi oluştur">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      <div className="suggestionBlock">
        <span>Hızlı başlangıç</span>
        <div className="suggestions">
          {suggestions.map(([topic, label]) => (
            <button key={topic} type="button" data-topic={topic}>
              {label}
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </div>

      <div className="hiddenControls" aria-hidden="false">
        <select id="levelInput" defaultValue="beginner">
          <option value="beginner">Başlangıç</option>
          <option value="intermediate">Orta</option>
          <option value="advanced">İleri</option>
        </select>
        <input id="targetMinutesInput" type="number" min="1" max="30" step="1" defaultValue="10" />
        <input id="targetSegmentsInput" type="number" min="2" max="40" step="1" defaultValue="20" />
        <input id="priorInput" type="text" defaultValue="" />
        <textarea id="interruptInput" defaultValue="" />
      </div>
    </section>
  );
}
