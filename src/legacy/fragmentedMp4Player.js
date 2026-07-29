const MIME_CANDIDATES = [
  'video/mp4; codecs="avc1.4D402A, mp4a.40.2"',
  'video/mp4; codecs="avc1.4D401F, mp4a.40.2"',
  'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
];

function concatBytes(parts) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function boxType(bytes, offset) {
  return String.fromCharCode(
    bytes[offset + 4],
    bytes[offset + 5],
    bytes[offset + 6],
    bytes[offset + 7]
  );
}

function readBoxSize(bytes, offset) {
  if (offset + 8 > bytes.byteLength) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset);
  const size32 = view.getUint32(0);
  if (size32 === 0) return null;
  if (size32 !== 1) return size32;
  if (offset + 16 > bytes.byteLength) return null;
  const high = view.getUint32(8);
  const low = view.getUint32(12);
  const size = (high * 2 ** 32) + low;
  return Number.isSafeInteger(size) ? size : null;
}

export class FragmentedMp4Player {
  constructor(video, {
    onConnected,
    onFirstFragment,
    onFragment,
    onInterrupted,
    onEnded,
    onError
  } = {}) {
    this.video = video;
    this.onConnected = onConnected;
    this.onFirstFragment = onFirstFragment;
    this.onFragment = onFragment;
    this.onInterrupted = onInterrupted;
    this.onEnded = onEnded;
    this.onError = onError;
    this.generation = 0;
    this.abortController = null;
    this.mediaSource = null;
    this.sourceBuffer = null;
    this.objectUrl = null;
    this.readBuffer = new Uint8Array(0);
    this.initParts = [];
    this.prefixParts = [];
    this.fragmentParts = [];
    this.appendQueue = [];
    this.activeAppend = null;
    this.initQueued = false;
    this.streamEnded = false;
    this.fragmentCount = 0;
  }

  async start(url) {
    this.stop();
    const generation = ++this.generation;
    if (!('MediaSource' in window)) {
      throw new Error('Bu tarayıcı kesintisiz MP4 buffer akışını desteklemiyor.');
    }

    const mimeType = MIME_CANDIDATES.find((candidate) => (
      window.MediaSource.isTypeSupported(candidate)
    ));
    if (!mimeType) {
      throw new Error('Tarayıcı 720p60 H.264/AAC canlı akışını desteklemiyor.');
    }

    this.abortController = new AbortController();
    this.mediaSource = new window.MediaSource();
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.video.src = this.objectUrl;
    this.video.load();

    await new Promise((resolve, reject) => {
      const onOpen = () => {
        cleanup();
        resolve();
      };
      const onSourceError = () => {
        cleanup();
        reject(new Error('Canlı video buffer alanı açılamadı.'));
      };
      const cleanup = () => {
        this.mediaSource?.removeEventListener('sourceopen', onOpen);
        this.mediaSource?.removeEventListener('error', onSourceError);
      };
      this.mediaSource.addEventListener('sourceopen', onOpen, { once: true });
      this.mediaSource.addEventListener('error', onSourceError, { once: true });
    });
    if (generation !== this.generation) return;

    this.sourceBuffer = this.mediaSource.addSourceBuffer(mimeType);
    this.sourceBuffer.mode = 'segments';
    this.sourceBuffer.addEventListener('updateend', () => this.handleUpdateEnd(generation));
    this.sourceBuffer.addEventListener('error', () => {
      this.fail(new Error('Canlı video parçası buffer alanına eklenemedi.'), generation);
    });
    this.onConnected?.();
    void this.consume(url, generation);
  }

  async consume(url, generation) {
    try {
      const response = await fetch(url, {
        cache: 'no-store',
        signal: this.abortController.signal
      });
      if (!response.ok || !response.body) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Canlı video bağlantısı açılamadı (${response.status}).`);
      }

      const reader = response.body.getReader();
      while (generation === this.generation) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value?.byteLength) this.consumeBytes(value, generation);
      }
      if (generation !== this.generation) return;
      this.flushTrailingFragment();
      this.streamEnded = true;
      this.maybeEndStream();
    } catch (error) {
      if (error?.name === 'AbortError' || generation !== this.generation) return;
      // The backend can lose only the final FFmpeg/trailer bytes after already
      // sending valid fMP4 fragments. Keep those fragments playable instead of
      // tearing down a lesson which is already on screen.
      if (
        this.initQueued
        && (
          this.fragmentCount > 0
          || this.fragmentParts.length > 0
          || this.appendQueue.some((item) => item.media)
          || this.activeAppend?.media
        )
      ) {
        this.flushTrailingFragment();
        this.streamEnded = true;
        this.maybeEndStream();
        this.onInterrupted?.(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      this.fail(error, generation);
    }
  }

  consumeBytes(chunk, generation) {
    if (generation !== this.generation) return;
    this.readBuffer = concatBytes([this.readBuffer, chunk]);
    let offset = 0;

    while (offset + 8 <= this.readBuffer.byteLength) {
      const size = readBoxSize(this.readBuffer, offset);
      if (!size || size < 8 || offset + size > this.readBuffer.byteLength) break;
      const type = boxType(this.readBuffer, offset);
      const box = this.readBuffer.slice(offset, offset + size);
      this.consumeBox(type, box);
      offset += size;
    }

    if (offset) this.readBuffer = this.readBuffer.slice(offset);
  }

  consumeBox(type, box) {
    if (!this.initQueued) {
      this.initParts.push(box);
      if (type === 'moov') {
        this.enqueue(concatBytes(this.initParts), false);
        this.initParts = [];
        this.initQueued = true;
      }
      return;
    }

    if (type === 'moof') {
      this.flushTrailingFragment();
      this.fragmentParts = [...this.prefixParts, box];
      this.prefixParts = [];
      return;
    }

    if (this.fragmentParts.length) {
      this.fragmentParts.push(box);
      if (type === 'mdat') this.flushTrailingFragment();
      return;
    }

    this.prefixParts.push(box);
  }

  flushTrailingFragment() {
    if (!this.fragmentParts.length) return;
    this.enqueue(concatBytes(this.fragmentParts), true);
    this.fragmentParts = [];
  }

  enqueue(data, media) {
    this.appendQueue.push({ data, media });
    this.pump();
  }

  pump() {
    if (
      !this.sourceBuffer
      || this.sourceBuffer.updating
      || this.activeAppend
      || !this.appendQueue.length
    ) {
      this.maybeEndStream();
      return;
    }

    const item = this.appendQueue.shift();
    this.activeAppend = item;
    try {
      this.sourceBuffer.appendBuffer(item.data);
    } catch (error) {
      this.activeAppend = null;
      this.fail(error, this.generation);
    }
  }

  handleUpdateEnd(generation) {
    if (generation !== this.generation) return;
    const appended = this.activeAppend;
    this.activeAppend = null;
    if (appended?.media) {
      this.fragmentCount += 1;
      if (this.fragmentCount === 1) {
        this.onFirstFragment?.();
        this.video.play().catch(() => {});
      }
      this.onFragment?.(this.fragmentCount);
    }
    this.pump();
  }

  maybeEndStream() {
    if (
      !this.streamEnded
      || !this.mediaSource
      || this.mediaSource.readyState !== 'open'
      || this.sourceBuffer?.updating
      || this.activeAppend
      || this.appendQueue.length
    ) {
      return;
    }
    try {
      this.mediaSource.endOfStream();
      this.onEnded?.();
    } catch {
      // The video element can close MediaSource itself during navigation/reset.
    }
  }

  fail(error, generation) {
    if (generation !== this.generation) return;
    this.onError?.(error instanceof Error ? error : new Error(String(error)));
  }

  stop() {
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    if (this.sourceBuffer?.updating) {
      try {
        this.sourceBuffer.abort();
      } catch {
        // SourceBuffer may already be detached.
      }
    }
    this.sourceBuffer = null;
    this.mediaSource = null;
    this.appendQueue = [];
    this.activeAppend = null;
    this.readBuffer = new Uint8Array(0);
    this.initParts = [];
    this.prefixParts = [];
    this.fragmentParts = [];
    this.streamEnded = false;
    this.fragmentCount = 0;
    this.video.pause();
    this.video.removeAttribute('src');
    this.video.load();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = null;
  }
}
