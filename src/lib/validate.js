'use strict';

const crypto = require('crypto');
const crc32 = require('turbo-crc32/crc32');
const constants = require('./constants');
const encode = require('../message/encode');

const { FINGERPRINT, MESSAGE_INTEGRITY, MESSAGE_INTEGRITY_SHA256 } =
  constants.attributeType;
const {
  kStunFingerprintXorValue,
  kStunFingerprintLength,
  kStunMessageIntegrityLength,
  kStunMessageIntegritySha256Length,
} = constants;

module.exports = {
  validateFingerprint,
  validateMessageIntegrity,
  validateMessageIntegritySha256,
};

const toUInt32 = (x) => x >>> 0;

/**
 * Verifies that a given buffer is STUN by checking for a correct FINGERPRINT.
 * @param {StunMessage} message
 * @returns {bool}
 */
function validateFingerprint(message) {
  if (message.isLegacy()) {
    return false;
  }

  const fingerprintAttribute = message.getAttribute(FINGERPRINT);

  if (fingerprintAttribute === undefined) {
    return false;
  }

  const crc32buf = encode(message).subarray(0, -kStunFingerprintLength);
  const currentCRC32 = fingerprintAttribute.value;

  return toUInt32(crc32(crc32buf) ^ kStunFingerprintXorValue) === currentCRC32;
}

/**
 * Validates that a raw STUN message has a correct MESSAGE-INTEGRITY value.
 * @param {StunMessage} message
 * @param {string} password
 * @returns {bool}
 */
function validateMessageIntegrity(message, password) {
  let offsetEnd = 0;

  const fingerprintAttribute = message.getAttribute(FINGERPRINT);
  const messageIntegrityAttribute = message.getAttribute(MESSAGE_INTEGRITY);

  const isFingerprintExist = fingerprintAttribute !== undefined;

  // Calc offsets if FINGERPRINT attribute exist.
  if (isFingerprintExist) {
    offsetEnd += kStunFingerprintLength;
  }

  if (messageIntegrityAttribute === undefined) {
    return false;
  }

  offsetEnd += kStunMessageIntegrityLength;

  // Copy the slice so we don't mutate the encoded buffer through a shared view.
  const buf = Buffer.from(encode(message).subarray(0, -offsetEnd));

  // Remove length of FINGERPRINT attribute from message size.
  if (isFingerprintExist) {
    const currentLength = buf.readUInt16BE(2);
    buf.writeUInt16BE(currentLength - kStunFingerprintLength, 2);
  }

  const hmac = crypto.createHmac('sha1', password);
  hmac.update(buf);

  const computed = hmac.digest();
  const expected = Buffer.from(messageIntegrityAttribute.value);
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}

/**
 * Validates that a raw STUN message has a correct MESSAGE-INTEGRITY-SHA256 value (RFC 8489).
 * @param {StunMessage} message
 * @param {string|Buffer} key HMAC key.
 * @returns {boolean}
 */
function validateMessageIntegritySha256(message, key) {
  let offsetEnd = 0;

  const fingerprintAttribute = message.getAttribute(FINGERPRINT);
  const messageIntegrityAttribute = message.getAttribute(MESSAGE_INTEGRITY_SHA256);

  const isFingerprintExist = fingerprintAttribute !== undefined;

  if (isFingerprintExist) {
    offsetEnd += kStunFingerprintLength;
  }

  if (messageIntegrityAttribute === undefined) {
    return false;
  }

  offsetEnd += kStunMessageIntegritySha256Length;

  const buf = Buffer.from(encode(message).subarray(0, -offsetEnd));

  if (isFingerprintExist) {
    const currentLength = buf.readUInt16BE(2);
    buf.writeUInt16BE(currentLength - kStunFingerprintLength, 2);
  }

  const hmac = crypto.createHmac('sha256', key);
  hmac.update(buf);

  const computed = hmac.digest();
  const expected = Buffer.from(messageIntegrityAttribute.value);
  if (computed.length !== expected.length) return false;
  return crypto.timingSafeEqual(computed, expected);
}
