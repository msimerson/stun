'use strict';

const crypto = require('crypto');
const crc32 = require('turbo-crc32/crc32');
const {
  createEncodeStream,
  encode,
  encodingLength,
  types: { array },
} = require('binary-data');
const StunMessage = require('./message');
const constants = require('../lib/constants');
const attributes = require('../lib/attributes');
const { StunMessagePacket, StunAttributePacket } = require('../lib/protocol');

const {
  attributeType,
  messageType,
  kStunFingerprintXorValue,
  kStunFingerprintLength,
  kStunMessageIntegrityLength,
  kStunMessageIntegritySha256Length,
  kStunMessageIntegritySha256Size,
  kStunTransactionIdLength,
  kStunMessageIntegritySize,
  kStunLegacyTransactionIdLength,
} = constants;

const EMPTY_MESSAGE_INTEGRITY = Buffer.alloc(kStunMessageIntegritySize, 0);
const EMPTY_MESSAGE_INTEGRITY_SHA256 = Buffer.alloc(kStunMessageIntegritySha256Size, 0);

const toUInt32 = (x) => x >>> 0;
const isUInt32 = (v) => v >= 0 && v <= 0xffffffff;

/**
 * This class implements outgoing STUN messages.
 */
class StunRequest extends StunMessage {
  /**
   * Set message type.
   * @param {number} type - A message type, see constants.
   */
  setType(type) {
    this._type = Number(type);
  }

  /**
   * Set `transaction` field for current message.
   * @param {Buffer} transactionId The value of `transaction` field.
   * @returns {boolean} Was the operation successful or not.
   */
  setTransactionId(transactionId) {
    if (!isValidTransactionId(transactionId)) {
      return false;
    }

    this._transactionId = transactionId;
    return true;
  }

  /**
   * Add an attribute for the message.
   * @param {number} type Attribute type.
   * @param {any[]} arguments_ Values of an attribute.
   * @returns {StunAttribute|undefined} Return undefined if attribute already exists.
   */
  addAttribute(type, ...arguments_) {
    const attribute = attributes.create(type, ...arguments_);
    attribute.setOwner(this);

    // It should be one unique attribute type per message.
    if (this.hasAttribute(type)) {
      return undefined;
    }

    this._attributes.push(attribute);
    return attribute;
  }

  /**
   * Remove attribute from current message.
   * @param {number} type - Attribute type.
   * @returns {StunAttribute|undefined}
   */
  removeAttribute(type) {
    const index = this._attributes.findIndex((attribute) => attribute.type === type);
    if (index === -1) return undefined;
    const attribute = this._attributes[index];
    this._attributes = this._attributes.toSpliced(index, 1);
    return attribute;
  }

  /**
   * Add MAPPED_ADDRESS attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {StunAttribute|undefined}
   */
  addAddress(address, port) {
    return this.addAttribute(attributeType.MAPPED_ADDRESS, address, port);
  }

  /**
   * Add ALTERNATE-SERVER attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {StunAttribute|undefined}
   */
  addAlternateServer(address, port) {
    return this.addAttribute(attributeType.ALTERNATE_SERVER, address, port);
  }

  /**
   * Add XOR_MAPPED_ADDRESS attribute.
   * @param {string} address IP address.
   * @param {number} port
   * @returns {StunAttribute|undefined}
   */
  addXorAddress(address, port) {
    return this.addAttribute(attributeType.XOR_MAPPED_ADDRESS, address, port);
  }

  /**
   * Add USERNAME attribute.
   * @param {string|Buffer} username
   * @returns {StunAttribute|undefined}
   */
  addUsername(username) {
    if (username.length >= 513) {
      throw new Error(
        'Username must be less than 513 bytes, see' +
          ' https://tools.ietf.org/html/rfc5389#section-15.3',
      );
    }
    return this.addAttribute(attributeType.USERNAME, username);
  }

  /**
   * Add ERROR-CODE attribute.
   * @param {number} code
   * @param {string} [reason]
   * @returns {StunAttribute|undefined}
   */
  addError(code, reason) {
    assertErrorType(this.type);

    // The Class represents
    // the hundreds digit of the error code.  The value MUST be between 3
    // and 6.  The Number represents the error code modulo 100, and its
    // value MUST be between 0 and 99.
    if (code < 300 || code > 699) {
      throw new Error(
        'Error code should between 300 - 699, see https://tools.ietf.org/html/rfc5389#section-15.6',
      );
    }

    if (reason && reason.length > 128) {
      throw new Error(
        'The reason phrase MUST be a UTF-8 encoded sequence of less than 128 characters',
      );
    }

    // Set default error reason for standard error codes.
    if (!reason && constants.errorNames.has(code)) {
      reason = constants.errorReason[constants.errorNames.get(code)];
    }

    return this.addAttribute(attributeType.ERROR_CODE, code, reason);
  }

  /**
   * Add REALM attribute.
   * @param {string} realm
   * @returns {StunAttribute|undefined}
   */
  addRealm(realm) {
    assert128string(realm);

    return this.addAttribute(attributeType.REALM, realm);
  }

  /**
   * Add NONCE attribute.
   * @param {string} nonce
   * @returns {StunAttribute|undefined}
   */
  addNonce(nonce) {
    assert128string(nonce);

    return this.addAttribute(attributeType.NONCE, nonce);
  }

  /**
   * Add SOFTWARE attribute.
   * @param {string} software
   * @returns {StunAttribute|undefined}
   */
  addSoftware(software) {
    assert128string(software);

    return this.addAttribute(attributeType.SOFTWARE, software);
  }

  /**
   * Add UNKNOWN-ATTRIBUTES attribute.
   * @param {number[]} attributes_ List of unknown attributes.
   * @returns {StunAttribute|undefined}
   */
  addUnknownAttributes(attributes_) {
    assertErrorType(this.type);

    return this.addAttribute(attributeType.UNKNOWN_ATTRIBUTES, attributes_);
  }

  /**
   * Adds a MESSAGE-INTEGRITY attribute that is valid for the current message.
   * @param {string} key Secret hmac key.
   * @returns {boolean} The result of an operation.
   */
  addMessageIntegrity(key) {
    if (!key) {
      return false;
    }

    const attributeIntegrity = this.addAttribute(
      attributeType.MESSAGE_INTEGRITY,
      EMPTY_MESSAGE_INTEGRITY,
    );
    const message = this.toBuffer();

    if (message.length === 0) {
      return false;
    }

    const hmac = crypto.createHmac('sha1', key);
    hmac.update(message.subarray(0, -kStunMessageIntegrityLength));

    return attributeIntegrity.setValue(hmac.digest());
  }

  /**
   * Adds a MESSAGE-INTEGRITY-SHA256 attribute (RFC 8489).
   * Must not be used together with MESSAGE-INTEGRITY in the same message.
   * @param {string|Buffer} key HMAC key.
   * @returns {boolean} The result of an operation.
   */
  addMessageIntegritySha256(key) {
    if (!key) return false;
    if (this.hasAttribute(attributeType.MESSAGE_INTEGRITY)) return false;

    const attributeIntegrity = this.addAttribute(
      attributeType.MESSAGE_INTEGRITY_SHA256,
      EMPTY_MESSAGE_INTEGRITY_SHA256,
    );
    const message = this.toBuffer();

    if (message.length === 0) return false;

    const hmac = crypto.createHmac('sha256', key);
    hmac.update(message.subarray(0, -kStunMessageIntegritySha256Length));
    return attributeIntegrity.setValue(hmac.digest());
  }

  /**
   * Adds a USERHASH attribute (RFC 8489).
   * Sends SHA-256(username ":" realm) instead of the plaintext username.
   * REALM must be present; USERNAME must be omitted.
   * @param {string} username
   * @param {string} realm
   * @returns {StunAttribute|undefined}
   */
  addUserhash(username, realm) {
    if (typeof username !== 'string' || typeof realm !== 'string') {
      throw new TypeError('username and realm must be strings');
    }
    const hash = crypto.createHash('sha256').update(`${username}:${realm}`).digest();
    return this.addAttribute(attributeType.USERHASH, hash);
  }

  /**
   * Adds a PASSWORD-ALGORITHM attribute (RFC 8489).
   * Tells the server which algorithm the client chose for this exchange.
   * @param {number} algorithm Algorithm identifier (see constants.passwordAlgorithm).
   * @param {Buffer} [params] Algorithm parameters (empty for MD5 and SHA-256).
   * @returns {StunAttribute|undefined}
   */
  addPasswordAlgorithm(algorithm, params = Buffer.alloc(0)) {
    return this.addAttribute(attributeType.PASSWORD_ALGORITHM, algorithm, params);
  }

  /**
   * Adds a PASSWORD-ALGORITHMS attribute (RFC 8489).
   * Used by servers to advertise supported algorithms in 401 responses.
   * @param {Array<{algorithm: number, params?: Buffer}>} algorithms
   * @returns {StunAttribute|undefined}
   */
  addPasswordAlgorithms(algorithms) {
    return this.addAttribute(attributeType.PASSWORD_ALGORITHMS, algorithms);
  }

  /**
   * Adds an ALTERNATE-DOMAIN attribute (RFC 8489).
   * Companion to ALTERNATE-SERVER; carries the FQDN of the alternate server.
   * @param {string} domain FQDN.
   * @returns {StunAttribute|undefined}
   */
  addAlternateDomain(domain) {
    if (typeof domain !== 'string') {
      throw new TypeError('domain must be a string');
    }
    return this.addAttribute(attributeType.ALTERNATE_DOMAIN, domain);
  }

  /**
   * Adds a FINGERPRINT attribute that is valid for the current message.
   * @returns {boolean} The result of an operation.
   */
  addFingerprint() {
    const attributeFingerprint = this.addAttribute(attributeType.FINGERPRINT, 0);
    const message = this.toBuffer();

    if (message.length === 0) {
      return false;
    }

    const crc32buf = message.subarray(0, -kStunFingerprintLength);
    return attributeFingerprint.setValue(
      toUInt32(crc32(crc32buf) ^ kStunFingerprintXorValue),
    );
  }

  /**
   * Add PRIORITY attribute.
   * @param {number} priority
   * @returns {StunAttribute|undefined}
   */
  addPriority(priority) {
    if (!Number.isInteger(priority) || !isUInt32(priority)) {
      throw new TypeError('The argument should be a 32-bit unsigned integer.');
    }

    return this.addAttribute(attributeType.PRIORITY, priority);
  }

  /**
   * Add USE-CANDIDATE attribute.
   * @returns {StunAttribute|undefined}
   */
  addUseCandidate() {
    return this.addAttribute(attributeType.USE_CANDIDATE);
  }

  /**
   * Add ICE-CONTROLLED attribute.
   * @param {Buffer} tiebreaker
   * @returns {StunAttribute|undefined}
   */
  addIceControlled(tiebreaker) {
    assertBindingRequest(this.type);

    if (!Buffer.isBuffer(tiebreaker) || tiebreaker.length !== 8) {
      throw new Error('The content of the attribute shoud be a 64-bit unsigned integer');
    }

    return this.addAttribute(attributeType.ICE_CONTROLLED, tiebreaker);
  }

  /**
   * Add ICE-CONTROLLING attribute.
   * @param {Buffer} tiebreaker
   * @returns {StunAttribute|undefined}
   */
  addIceControlling(tiebreaker) {
    assertBindingRequest(this.type);

    if (!Buffer.isBuffer(tiebreaker) || tiebreaker.length !== 8) {
      throw new Error('The content of the attribute shoud be a 64-bit unsigned integer');
    }

    return this.addAttribute(attributeType.ICE_CONTROLLING, tiebreaker);
  }

  /**
   * Write current message to an encode stream.
   * @param {Object} encodeStream Output stream from binary-data.
   * @returns {boolean}
   */
  write(encodeStream) {
    const attributes_ = this._attributes.map((attribute) => ({
      type: attribute.type,
      value: attribute.toBuffer(),
    }));

    const packet = {
      header: {
        type: this.type,
        length: encodingLength(
          attributes_,
          array(StunAttributePacket, attributes_.length),
        ),
        cookie: this._cookie,
        transaction: this.transactionId,
      },
      attributes: attributes_,
    };

    encode(packet, encodeStream, StunMessagePacket);
    return true;
  }

  /**
   * Convert current message to a Buffer.
   * @returns {Buffer} Encoded stun message.
   */
  toBuffer() {
    const encodeStream = createEncodeStream();

    this.write(encodeStream);
    return encodeStream.slice();
  }
}

// Soft deprecate setTransactionID().
StunRequest.prototype.setTransactionID = StunRequest.prototype.setTransactionId;

/**
 * Check if transaction id is valid.
 * @param {Buffer} transactionId
 * @returns {boolean}
 */
function isValidTransactionId(transactionId) {
  return (
    Buffer.isBuffer(transactionId) &&
    (transactionId.length === kStunTransactionIdLength ||
      transactionId.length === kStunLegacyTransactionIdLength)
  );
}

/**
 * Check if argument is a string of fewer than 128 characters.
 * @param {any} string
 */
function assert128string(string) {
  if (typeof string !== 'string' || string.length > 128) {
    throw new Error(
      'The argument MUST be a UTF-8 encoded sequence of less than 128 characters',
    );
  }
}

/**
 * Check if message type class is ERROR.
 * @param {number} type Message type.
 */
function assertErrorType(type) {
  const isErrorType =
    type === messageType.BINDING_ERROR_RESPONSE ||
    type === messageType.ALLOCATE_ERROR_RESPONSE ||
    type === messageType.REFRESH_ERROR_RESPONSE;

  if (!isErrorType) {
    throw new Error('The attribute should be in ERROR_RESPONSE messages');
  }
}

/**
 * Check if message type is BINDING-REQUEST.
 * @param {number} type Message type.
 */
function assertBindingRequest(type) {
  if (type !== messageType.BINDING_REQUEST) {
    throw new Error('The attribute should present in a Binding request.');
  }
}

module.exports = StunRequest;
