import test from 'node:test';
import assert from 'node:assert/strict';
import {
  manifestBelongsTo,
  orderedNewPartials
} from '../src/legacy/progressiveManimPlayer.js';

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

