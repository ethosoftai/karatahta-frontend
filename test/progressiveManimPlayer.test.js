import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasPlaybackBuffer,
  manifestBelongsTo,
  orderedNewPartials,
  splitFragmentedMp4
} from '../src/legacy/progressiveManimPlayer.js';

function mp4Box(type, payload = []) {
  const bytes = new Uint8Array(8 + payload.length);
  new DataView(bytes.buffer).setUint32(0, bytes.byteLength);
  for (let index = 0; index < 4; index += 1) {
    bytes[4 + index] = type.charCodeAt(index);
  }
  bytes.set(payload, 8);
  return bytes;
}

test('manifest partiallarini siralar, tekrarları atlar ve boslugu gecmez', () => {
  const result = orderedNewPartials([
    { sequence: 2 },
    { sequence: 1 },
    { sequence: 1 },
    { sequence: 4 }
  ], new Set([0]), 1);
  assert.deepEqual(result.map((partial) => partial.sequence), [1, 2]);
});

test('eski sohbet veya job manifestini reddeder', () => {
  assert.equal(manifestBelongsTo({
    jobId: 'job-a',
    lessonId: 'lesson-a'
  }, 'job-a', 'lesson-a'), true);
  assert.equal(manifestBelongsTo({
    jobId: 'job-a',
    lessonId: 'lesson-a'
  }, 'job-b', 'lesson-a'), false);
  assert.equal(manifestBelongsTo({
    jobId: 'job-a',
    lessonId: 'lesson-a'
  }, 'job-a', 'lesson-b'), false);
});

test('fMP4 init ve media kutularini append kuyrugu icin ayirir', () => {
  const input = new Uint8Array([
    ...mp4Box('ftyp'),
    ...mp4Box('moov'),
    ...mp4Box('moof'),
    ...mp4Box('mdat', [1, 2, 3])
  ]);
  const result = splitFragmentedMp4(input);
  assert.equal(result.init.byteLength, 16);
  assert.equal(result.media.byteLength, 19);
  assert.throws(() => splitFragmentedMp4(input.slice(0, -1)), /Eksik|gecersiz/);
});

test('oynatma 6 saniyelik gercek buffer dolmadan baslamaz', () => {
  assert.equal(hasPlaybackBuffer(5.99, 6), false);
  assert.equal(hasPlaybackBuffer(6, 6), true);
});
