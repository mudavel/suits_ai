import test from 'node:test'
import assert from 'node:assert/strict'
import { submitChatOnEnter } from './chatKeyboard.js'

function press(overrides = {}) {
  let prevented = 0, submitted = 0
  submitChatOnEnter({ key: 'Enter', nativeEvent: {}, preventDefault: () => prevented++,
    currentTarget: { form: { requestSubmit: () => submitted++ } }, ...overrides })
  return { prevented, submitted }
}

test('Enter envia pelo mesmo formulário do botão', () => {
  assert.deepEqual(press(), { prevented: 1, submitted: 1 })
})

test('Shift+Enter e digitação comum preservam o texto', () => {
  for (const event of [{ shiftKey: true }, { key: 'a' }])
    assert.deepEqual(press(event), { prevented: 0, submitted: 0 })
})

test('composição de texto não envia e Enter mantido não repete o envio', () => {
  for (const nativeEvent of [{ isComposing: true }, { keyCode: 229 }])
    assert.deepEqual(press({ nativeEvent }), { prevented: 0, submitted: 0 })
  assert.deepEqual(press({ repeat: true }), { prevented: 1, submitted: 0 })
})
