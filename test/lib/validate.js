'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const {
  validateFingerprint,
  validateMessageIntegrity,
  validateMessageIntegritySha256,
} = require('../../src/lib/validate');
const constants = require('../../src/lib/constants');
const decode = require('../../src/message/decode');
const { createMessage } = require('../../src/lib/create-message');

const { SOFTWARE } = constants.attributeType;
const { BINDING_RESPONSE } = constants.messageType;

test('validate fingerprint', () => {
  const packet = Buffer.from(
    '0101002c2112a442644d4f37326c71514d4f4a51' +
      '002000080001cc03e1baa56100080014a8fbde3bdc5ff7ab1e8' +
      '52a8c2cc6ef651cb74889802800042748c3bb',
    'hex',
  );

  const message = decode(packet);

  assert.equal(validateFingerprint(message), true);
});

test('`validateFingerprint` should support uint32 value', () => {
  const message = createMessage();

  message.setType(BINDING_RESPONSE);
  message.addAttribute(SOFTWARE, '123456789');
  message.addFingerprint();

  assert.equal(validateFingerprint(message), true);
});

test('validate MESSAGE INTEGRITY', () => {
  const packet = Buffer.from(
    '010100242112a4426f576f544a34445674305276' +
      '002000080001db91e1baa56600080014e161f72ee' +
      '71ed9f6accaef828ec42f19a809045a',
    'hex',
  );

  const message = decode(packet);
  const password = '6Gzr+PH5Krjg0VqBa81nE7n6';

  assert.equal(validateMessageIntegrity(message, password), true);
});

test('validate MESSAGE INTEGRITY + FINGERPRINT', () => {
  const password = '6Gzr+PH5Krjg0VqBa81nE7n6';
  const message = createMessage();

  message.setType(BINDING_RESPONSE);
  message.addAttribute(SOFTWARE, '123456789');
  message.addMessageIntegrity(password);
  message.addFingerprint();

  assert.equal(validateMessageIntegrity(message, password), true);
  assert.equal(validateFingerprint(message), true);
});

test('validate MESSAGE-INTEGRITY-SHA256', () => {
  const password = 'sha256-secret';
  const message = createMessage();

  message.setType(BINDING_RESPONSE);
  message.addAttribute(SOFTWARE, 'rfc8489-test');
  message.addMessageIntegritySha256(password);

  assert.equal(validateMessageIntegritySha256(message, password), true);
  assert.equal(validateMessageIntegritySha256(message, 'wrong-key'), false);
});

test('validate MESSAGE-INTEGRITY-SHA256 + FINGERPRINT', () => {
  const password = 'sha256-secret';
  const message = createMessage();

  message.setType(BINDING_RESPONSE);
  message.addAttribute(SOFTWARE, 'rfc8489-test');
  message.addMessageIntegritySha256(password);
  message.addFingerprint();

  assert.equal(validateMessageIntegritySha256(message, password), true);
  assert.equal(validateFingerprint(message), true);
});

test('validateMessageIntegritySha256: returns false when attribute absent', () => {
  const message = createMessage();
  message.setType(BINDING_RESPONSE);
  assert.equal(validateMessageIntegritySha256(message, 'key'), false);
});

test('addMessageIntegritySha256: cannot coexist with MESSAGE-INTEGRITY', () => {
  const password = 'shared';
  const message = createMessage();
  message.setType(BINDING_RESPONSE);
  message.addMessageIntegrity(password);
  // Adding SHA-256 integrity when SHA-1 is already present must return false.
  assert.equal(message.addMessageIntegritySha256(password), false);
});
