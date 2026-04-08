'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const StunPasswordAlgorithmAttribute = require('../../src/attributes/stun-password-algorithm-attribute');
const StunPasswordAlgorithmsAttribute = require('../../src/attributes/stun-password-algorithms-attribute');
const {
  attributeType,
  attributeValueType,
  passwordAlgorithm,
} = require('../../src/lib/constants');

// --- StunPasswordAlgorithmAttribute (PASSWORD_ALGORITHM, 0x001D) ---

test('PASSWORD_ALGORITHM: encode MD5 (no params)', () => {
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.MD5,
  );

  const buf = attr.toBuffer();
  assert.equal(buf.length, 4);
  assert.equal(buf.readUInt16BE(0), passwordAlgorithm.MD5);
  assert.equal(buf.readUInt16BE(2), 0); // params_length = 0
});

test('PASSWORD_ALGORITHM: encode SHA-256 (no params)', () => {
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.SHA_256,
  );

  const buf = attr.toBuffer();
  assert.equal(buf.length, 4);
  assert.equal(buf.readUInt16BE(0), passwordAlgorithm.SHA_256);
  assert.equal(buf.readUInt16BE(2), 0);
});

test('PASSWORD_ALGORITHM: encode with params', () => {
  const params = Buffer.from([0xde, 0xad, 0xbe]);
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.SHA_256,
    params,
  );

  const buf = attr.toBuffer();
  assert.equal(buf.length, 7); // 4-byte header + 3-byte params
  assert.equal(buf.readUInt16BE(0), passwordAlgorithm.SHA_256);
  assert.equal(buf.readUInt16BE(2), 3);
  assert.deepEqual(buf.subarray(4), params);
});

test('PASSWORD_ALGORITHM: decode round-trip (MD5)', () => {
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.MD5,
  );
  const buf = attr.toBuffer();

  const decoded = StunPasswordAlgorithmAttribute.from(
    attributeType.PASSWORD_ALGORITHM,
    buf,
    null,
  );
  assert.equal(decoded.value.algorithm, passwordAlgorithm.MD5);
  assert.equal(decoded.value.params.length, 0);
});

test('PASSWORD_ALGORITHM: decode round-trip (SHA-256 with params)', () => {
  const params = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.SHA_256,
    params,
  );
  const buf = attr.toBuffer();

  const decoded = StunPasswordAlgorithmAttribute.from(
    attributeType.PASSWORD_ALGORITHM,
    buf,
    null,
  );
  assert.equal(decoded.value.algorithm, passwordAlgorithm.SHA_256);
  assert.deepEqual(decoded.value.params, params);
});

test('PASSWORD_ALGORITHM: valueType', () => {
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.MD5,
  );
  assert.equal(attr.valueType, attributeValueType.PASSWORD_ALGORITHM);
});

test('PASSWORD_ALGORITHM: setValue', () => {
  const attr = new StunPasswordAlgorithmAttribute(
    attributeType.PASSWORD_ALGORITHM,
    passwordAlgorithm.MD5,
  );
  const params = Buffer.from([0xff]);
  assert.equal(attr.setValue({ algorithm: passwordAlgorithm.SHA_256, params }), true);
  assert.equal(attr.value.algorithm, passwordAlgorithm.SHA_256);
  assert.deepEqual(attr.value.params, params);
});

// --- StunPasswordAlgorithmsAttribute (PASSWORD_ALGORITHMS, 0x8002) ---

test('PASSWORD_ALGORITHMS: encode empty list', () => {
  const attr = new StunPasswordAlgorithmsAttribute(attributeType.PASSWORD_ALGORITHMS, []);
  assert.equal(attr.toBuffer().length, 0);
});

test('PASSWORD_ALGORITHMS: encode MD5 + SHA-256 (no params)', () => {
  const attr = new StunPasswordAlgorithmsAttribute(attributeType.PASSWORD_ALGORITHMS, [
    { algorithm: passwordAlgorithm.MD5 },
    { algorithm: passwordAlgorithm.SHA_256 },
  ]);

  const buf = attr.toBuffer();
  // MD5: [0x00,0x01,0x00,0x00] = 4 bytes (no padding needed)
  // SHA-256: [0x00,0x02,0x00,0x00] = 4 bytes
  assert.equal(buf.length, 8);
  assert.equal(buf.readUInt16BE(0), passwordAlgorithm.MD5);
  assert.equal(buf.readUInt16BE(2), 0);
  assert.equal(buf.readUInt16BE(4), passwordAlgorithm.SHA_256);
  assert.equal(buf.readUInt16BE(6), 0);
});

test('PASSWORD_ALGORITHMS: per-entry padding', () => {
  // params of length 3 → entry is 7 bytes → padded to 8
  const params = Buffer.from([0x01, 0x02, 0x03]);
  const attr = new StunPasswordAlgorithmsAttribute(attributeType.PASSWORD_ALGORITHMS, [
    { algorithm: passwordAlgorithm.SHA_256, params },
  ]);

  const buf = attr.toBuffer();
  assert.equal(buf.length, 8); // 7 bytes padded to 8
  assert.equal(buf.readUInt16BE(0), passwordAlgorithm.SHA_256);
  assert.equal(buf.readUInt16BE(2), 3); // params_length
  assert.deepEqual(buf.subarray(4, 7), params);
  assert.equal(buf[7], 0); // padding byte
});

test('PASSWORD_ALGORITHMS: decode round-trip', () => {
  const algorithms = [
    { algorithm: passwordAlgorithm.MD5, params: Buffer.alloc(0) },
    { algorithm: passwordAlgorithm.SHA_256, params: Buffer.alloc(0) },
  ];
  const attr = new StunPasswordAlgorithmsAttribute(
    attributeType.PASSWORD_ALGORITHMS,
    algorithms,
  );
  const buf = attr.toBuffer();

  const decoded = StunPasswordAlgorithmsAttribute.from(
    attributeType.PASSWORD_ALGORITHMS,
    buf,
    null,
  );
  assert.equal(decoded.value.length, 2);
  assert.equal(decoded.value[0].algorithm, passwordAlgorithm.MD5);
  assert.equal(decoded.value[1].algorithm, passwordAlgorithm.SHA_256);
});

test('PASSWORD_ALGORITHMS: decode with params round-trip', () => {
  const params = Buffer.from([0xca, 0xfe, 0xba]);
  const algorithms = [{ algorithm: passwordAlgorithm.SHA_256, params }];
  const attr = new StunPasswordAlgorithmsAttribute(
    attributeType.PASSWORD_ALGORITHMS,
    algorithms,
  );
  const decoded = StunPasswordAlgorithmsAttribute.from(
    attributeType.PASSWORD_ALGORITHMS,
    attr.toBuffer(),
    null,
  );
  assert.deepEqual(decoded.value[0].params, params);
});

test('PASSWORD_ALGORITHMS: valueType', () => {
  const attr = new StunPasswordAlgorithmsAttribute(attributeType.PASSWORD_ALGORITHMS, []);
  assert.equal(attr.valueType, attributeValueType.PASSWORD_ALGORITHMS);
});
