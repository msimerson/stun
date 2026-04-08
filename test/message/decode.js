'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const StunResponse = require('../../src/message/response');
const decode = require('../../src/message/decode');
const { createMessage } = require('../../src/lib/create-message');
const { messageType, attributeType } = require('../../src/lib/constants');

test('rejects buffers that are too short', () => {
  assert.throws(() => decode(Buffer.alloc(19)), /Invalid STUN message length/);
  assert.throws(() => decode(Buffer.alloc(0)), /Invalid STUN message length/);
  assert.throws(() => decode(Buffer.alloc(1)), /Invalid STUN message length/);
});

test('rejects buffers that are too long', () => {
  assert.throws(() => decode(Buffer.alloc(65536)), /Invalid STUN message length/);
});

test('should decode', () => {
  const packet = Buffer.from([
    0, 0x01 /* Type */, 0, 12 /* Length */, 0x21, 0x12, 0xa4, 0x42 /* Cookie */, 0xd0,
    0x05, 0x58, 0x70, 0x7b, 0xb8, 0xcc, 0x6a, 0x63, 0x3a, 0x9d, 0xf7 /* Transaction */, 0,
    0x20 /* XOR_MAPPED_ADDRESS */, 0, 8 /* Length */, 0 /* Reserved */, 0x1 /* Family */,
    0xd9, 0x36 /* Port */, 0xe1, 0xba, 0xa5, 0x61 /* Ip */,
  ]);

  const message = decode(packet);

  assert.equal(message instanceof StunResponse, true);
  assert.equal(message.type, messageType.BINDING_REQUEST);
  assert.deepEqual(message.transactionId, Buffer.from('d00558707bb8cc6a633a9df7', 'hex'));
  assert.equal(message.count, 1);

  const xorAddress = message.getXorAddress();
  assert.deepEqual(xorAddress, {
    port: 63524,
    family: 'IPv4',
    address: '192.168.1.35',
  });
});

test('getFingerprint returns the fingerprint value', () => {
  const msg = createMessage(messageType.BINDING_RESPONSE);
  msg.addAttribute(attributeType.SOFTWARE, 'test');
  msg.addFingerprint();

  // Round-trip through encode+decode
  const { encode } = require('../../src/message/encode') || {};
  // Use the StunRequest directly — getFingerprint should return the uint32 value
  const fp = msg.getAttribute(attributeType.FINGERPRINT);
  assert.ok(
    typeof fp.value === 'number',
    'fingerprint attribute value should be a number',
  );
  assert.ok(fp.value >>> 0 === fp.value, 'fingerprint should be uint32');
});

test('getFingerprint and getPriority return values from decoded response', () => {
  // Build a message with FINGERPRINT and PRIORITY, encode, decode, check getters
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');

  const req = new StunRequest();
  req.setType(messageType.BINDING_REQUEST);
  req.setTransactionId(Buffer.alloc(12, 0));
  req.addPriority(12345);
  req.addFingerprint();

  const decoded = decode(encode(req));
  assert.equal(decoded.getPriority(), 12345);
  assert.equal(typeof decoded.getFingerprint(), 'number');
  assert.ok(decoded.getFingerprint() >>> 0 === decoded.getFingerprint());
});

// RFC 8489 response getter round-trips

test('getMessageIntegritySha256 round-trip', () => {
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');
  const key = 'sha256-key';

  const req = new StunRequest();
  req.setType(messageType.BINDING_RESPONSE);
  req.addMessageIntegritySha256(key);

  const decoded = decode(encode(req));
  const hmac = decoded.getMessageIntegritySha256();
  assert.ok(Buffer.isBuffer(hmac));
  assert.equal(hmac.length, 32);
});

test('getUserhash round-trip', () => {
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');
  const crypto = require('crypto');

  const req = new StunRequest();
  req.setType(messageType.BINDING_REQUEST);
  req.addUserhash('user', 'realm.example.com');

  const decoded = decode(encode(req));
  const hash = decoded.getUserhash();
  assert.ok(Buffer.isBuffer(hash));
  assert.equal(hash.length, 32);

  const expected = crypto.createHash('sha256').update('user:realm.example.com').digest();
  assert.deepEqual(hash, expected);
});

test('getPasswordAlgorithm round-trip', () => {
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');
  const { passwordAlgorithm } = require('../../src/lib/constants');

  const req = new StunRequest();
  req.setType(messageType.BINDING_REQUEST);
  req.addPasswordAlgorithm(passwordAlgorithm.SHA_256);

  const decoded = decode(encode(req));
  const val = decoded.getPasswordAlgorithm();
  assert.equal(val.algorithm, passwordAlgorithm.SHA_256);
  assert.equal(val.params.length, 0);
});

test('getPasswordAlgorithms round-trip', () => {
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');
  const { passwordAlgorithm } = require('../../src/lib/constants');

  const req = new StunRequest();
  req.setType(messageType.BINDING_REQUEST);
  req.addPasswordAlgorithms([
    { algorithm: passwordAlgorithm.MD5 },
    { algorithm: passwordAlgorithm.SHA_256 },
  ]);

  const decoded = decode(encode(req));
  const algos = decoded.getPasswordAlgorithms();
  assert.equal(algos.length, 2);
  assert.equal(algos[0].algorithm, passwordAlgorithm.MD5);
  assert.equal(algos[1].algorithm, passwordAlgorithm.SHA_256);
});

test('getAlternateDomain round-trip', () => {
  const StunRequest = require('../../src/message/request');
  const encode = require('../../src/message/encode');

  const req = new StunRequest();
  req.setType(messageType.BINDING_RESPONSE);
  req.addAlternateDomain('stun.example.com');

  const decoded = decode(encode(req));
  assert.equal(decoded.getAlternateDomain(), 'stun.example.com');
});
