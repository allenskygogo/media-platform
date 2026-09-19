import test from 'node:test'
import assert from 'node:assert/strict'
import { hasFreeCoursePlayback, shouldForceFirstWatch } from '../shared/coursePlayback.js'

test('paid course members may seek on first view, including unfinished lessons', () => {
  for (const tier of ['standard', 'advanced', 'managed']) {
    assert.equal(hasFreeCoursePlayback({ role: 'student', tier }), true)
    assert.equal(shouldForceFirstWatch(hasFreeCoursePlayback({ tier }), null), false)
    assert.equal(shouldForceFirstWatch(hasFreeCoursePlayback({ tier }), { completed: false, currentSecond: 25 }), false)
  }
  for (const planId of ['creator', 'master', 'managed']) {
    assert.equal(hasFreeCoursePlayback({ planId }), true)
  }
})

test('trial users retain first-watch restrictions, regardless of email or conflicting legacy tier', () => {
  for (const user of [{ tier: 'basic' }, { planId: 'trial', tier: 'standard' }, { tier: 'basic', email: 'allen@xgfx-tw.com' }]) {
    assert.equal(hasFreeCoursePlayback(user), false)
    assert.equal(shouldForceFirstWatch(hasFreeCoursePlayback(user), undefined), true)
    assert.equal(shouldForceFirstWatch(hasFreeCoursePlayback(user), { completed: false }), true)
    assert.equal(shouldForceFirstWatch(hasFreeCoursePlayback(user), { completed: true }), false)
  }
})

test('AI-only and unknown accounts do not get course playback privileges', () => {
  for (const user of [null, {}, { tier: 'ai_free' }, { planId: 'ai_free', tier: 'standard' }, { tier: 'unknown' }]) {
    assert.equal(hasFreeCoursePlayback(user), false)
  }
})
