const chalkFont = '"Noto Sans", "Segoe UI", system-ui, sans-serif';

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function commandStartSeconds(command, duration) {
  return (clamp(command.at_percent, 0, 100) / 100) * Math.max(1, duration);
}

function drawChalkText(context, text, x, y, {
  color,
  fontSize,
  align = 'left',
  maxWidth,
  progress = 1
}) {
  const visibleText = String(text || '').slice(0, Math.ceil(String(text || '').length * clamp(progress, 0, 1)));
  if (!visibleText) return;
  context.save();
  context.font = `600 ${fontSize}px ${chalkFont}`;
  context.textAlign = align;
  context.textBaseline = 'middle';
  context.fillStyle = color;
  context.globalAlpha = 0.94;
  context.shadowColor = color;
  context.shadowBlur = 2.5;

  const words = visibleText.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);

  const lineHeight = fontSize * 1.24;
  lines.slice(0, 4).forEach((lineText, index) => {
    const lineY = y + (index * lineHeight);
    context.fillText(lineText, x, lineY);
    context.globalAlpha = 0.16;
    context.fillText(lineText, x + 0.8, lineY + 0.5);
    context.globalAlpha = 0.94;
  });
  context.restore();
}

function drawArrowHead(context, startX, startY, endX, endY, size) {
  const angle = Math.atan2(endY - startY, endX - startX);
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - (size * Math.cos(angle - Math.PI / 6)), endY - (size * Math.sin(angle - Math.PI / 6)));
  context.moveTo(endX, endY);
  context.lineTo(endX - (size * Math.cos(angle + Math.PI / 6)), endY - (size * Math.sin(angle + Math.PI / 6)));
  context.stroke();
}

export class LiveBoardPlayer {
  constructor({ canvas, audio, onStatus, onPlaybackBlocked, onEnded }) {
    this.canvas = canvas;
    this.audio = audio;
    this.context = canvas.getContext('2d');
    this.onStatus = onStatus;
    this.onPlaybackBlocked = onPlaybackBlocked;
    this.onEnded = onEnded;
    this.active = false;
    this.segmentId = null;
    this.durationSeconds = 1;
    this.commands = [];
    this.frameRequest = null;
    this.playbackBlocked = false;
    this.audio.addEventListener('ended', () => {
      if (!this.active) return;
      this.draw();
      this.onEnded?.({ segmentId: this.segmentId });
    });
  }

  get isActive() {
    return this.active;
  }

  get currentTime() {
    return Number(this.audio.currentTime || 0);
  }

  update({ segmentId, audioUrl, durationSeconds, commands }) {
    const changingSegment = this.segmentId !== segmentId;
    if (changingSegment) {
      this.stop();
      this.segmentId = segmentId;
      this.commands = [];
    }

    this.commands = [...(commands || [])]
      .sort((left, right) => left.at_percent - right.at_percent);
    this.durationSeconds = Math.max(1, Number(durationSeconds) || this.durationSeconds);
    this.active = true;
    this.canvas.classList.add('visible');
    this.canvas.setAttribute('aria-hidden', 'false');

    const nextAudioUrl = String(audioUrl || '');
    if (nextAudioUrl && this.audio.getAttribute('src') !== nextAudioUrl) {
      this.audio.src = nextAudioUrl;
      this.audio.load();
      this.play();
    } else if (this.audio.paused && !this.audio.ended && !this.playbackBlocked) {
      this.play();
    }

    if (!this.frameRequest) {
      this.frameRequest = requestAnimationFrame(() => this.tick());
    }
    this.onStatus?.('Gemini komutları canlı tahtada oynatılıyor');
  }

  async play() {
    try {
      await this.audio.play();
      this.playbackBlocked = false;
      this.onStatus?.('Canlı anlatım başladı');
    } catch {
      this.playbackBlocked = true;
      this.onPlaybackBlocked?.();
    }
  }

  retryPlayback() {
    if (!this.active) return false;
    this.playbackBlocked = false;
    this.play();
    return true;
  }

  snapshot() {
    return {
      active: this.active,
      segmentId: this.segmentId,
      currentTime: this.currentTime,
      durationSeconds: this.durationSeconds
    };
  }

  stop() {
    const snapshot = this.snapshot();
    this.active = false;
    this.playbackBlocked = false;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frameRequest = null;
    this.canvas.classList.remove('visible');
    this.canvas.setAttribute('aria-hidden', 'true');
    return snapshot;
  }

  tick() {
    this.frameRequest = null;
    if (!this.active) return;
    this.draw();
    this.frameRequest = requestAnimationFrame(() => this.tick());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(640, Math.round(rect.width * ratio));
    const height = Math.max(360, Math.round((rect.width * 9 / 16) * ratio));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  drawBackground(width, height) {
    const context = this.context;
    const gradient = context.createRadialGradient(width * 0.5, height * 0.42, 0, width * 0.5, height * 0.45, width * 0.72);
    gradient.addColorStop(0, '#122c27');
    gradient.addColorStop(0.72, '#0b211d');
    gradient.addColorStop(1, '#071512');
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);

    context.save();
    context.globalAlpha = 0.055;
    context.strokeStyle = '#d1fae5';
    context.lineWidth = 1;
    const grid = Math.max(28, width / 28);
    for (let x = grid; x < width; x += grid) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = grid; y < height; y += grid) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }
    context.restore();
  }

  draw() {
    this.resize();
    const context = this.context;
    const { width, height } = this.canvas;
    this.drawBackground(width, height);

    const duration = Number.isFinite(this.audio.duration)
      ? this.audio.duration
      : this.durationSeconds;
    const time = this.audio.ended ? duration : this.currentTime;
    const activeCommands = this.commands.filter((command) => (
      commandStartSeconds(command, duration) <= time + 0.04
    ));
    let firstVisibleIndex = 0;
    activeCommands.forEach((command, index) => {
      if (command.type === 'clear') firstVisibleIndex = index + 1;
    });

    for (const command of activeCommands.slice(firstVisibleIndex)) {
      this.drawCommand(command, time, duration, width, height);
    }
  }

  drawCommand(command, time, duration, width, height) {
    const context = this.context;
    const start = commandStartSeconds(command, duration);
    const commandProgress = clamp((time - start) / (Number(command.duration_ms || 1000) / 1000), 0, 1);
    const x = (Number(command.x) / 100) * width;
    const y = (Number(command.y) / 100) * height;
    const x2 = (Number(command.x2) / 100) * width;
    const y2 = (Number(command.y2) / 100) * height;
    const fontSize = (Number(command.font_size) / 100) * height;
    const strokeWidth = Math.max(1.5, (Number(command.stroke_width) / 100) * height);

    if (['title', 'write', 'equation'].includes(command.type)) {
      drawChalkText(context, command.text, x, y, {
        color: command.color,
        fontSize,
        align: command.type === 'title' ? 'center' : 'left',
        maxWidth: command.type === 'title' ? width * 0.78 : width * 0.42,
        progress: commandProgress
      });
      return;
    }

    context.save();
    context.strokeStyle = command.color;
    context.lineWidth = strokeWidth;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.globalAlpha = 0.94;
    context.shadowColor = command.color;
    context.shadowBlur = 2;

    if (command.type === 'line' || command.type === 'arrow') {
      const currentX = x + ((x2 - x) * commandProgress);
      const currentY = y + ((y2 - y) * commandProgress);
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(currentX, currentY);
      context.stroke();
      if (command.type === 'arrow' && commandProgress > 0.82) {
        drawArrowHead(context, x, y, currentX, currentY, Math.max(8, strokeWidth * 3.2));
      }
    } else if (command.type === 'circle') {
      context.beginPath();
      context.arc(x, y, (Number(command.radius) / 100) * width, -Math.PI / 2, (-Math.PI / 2) + (Math.PI * 2 * commandProgress));
      context.stroke();
    } else if (command.type === 'rectangle') {
      const rectWidth = (Number(command.width) / 100) * width;
      const rectHeight = (Number(command.height) / 100) * height;
      context.strokeRect(x, y, rectWidth * commandProgress, rectHeight * commandProgress);
    }
    context.restore();
  }
}
