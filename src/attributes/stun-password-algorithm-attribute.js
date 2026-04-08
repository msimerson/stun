'use strict';

const constants = require('../lib/constants');
const StunAttribute = require('./stun-attribute');

/**
 * This class implements the RFC 8489 PASSWORD-ALGORITHM attribute (0x001D).
 *
 * Wire format:
 *   0                   1                   2                   3
 *   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |          Algorithm            |  Algorithm Parameters Length  |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |                    Algorithm Parameters (variable)            |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *
 * Padding to a 4-byte boundary is handled by the outer STUN encoder.
 */
module.exports = class StunPasswordAlgorithmAttribute extends StunAttribute {
  #algorithm;
  #params;

  /**
   * @param {number} type Attribute type.
   * @param {number} algorithm Algorithm identifier (see constants.passwordAlgorithm).
   * @param {Buffer} [params] Algorithm parameters (empty for MD5 and SHA-256).
   */
  constructor(type, algorithm, params = Buffer.alloc(0)) {
    super(type);
    this.#algorithm = algorithm;
    this.#params = Buffer.isBuffer(params) ? params : Buffer.alloc(0);
  }

  /**
   * Create instance from a raw value buffer (used during decode).
   * @param {number} type
   * @param {Buffer} value
   * @param {object} owner
   * @returns {StunPasswordAlgorithmAttribute}
   */
  static from(type, value, owner) {
    const algorithm = value.readUInt16BE(0);
    const paramsLength = value.readUInt16BE(2);
    const params = value.subarray(4, 4 + paramsLength);
    const attr = new StunPasswordAlgorithmAttribute(type, algorithm, params);
    attr.setOwner(owner);
    return attr;
  }

  /**
   * Get attribute value.
   * @returns {{ algorithm: number, params: Buffer }}
   */
  get value() {
    return { algorithm: this.#algorithm, params: this.#params };
  }

  /**
   * Get type of attribute value.
   * @returns {number}
   */
  get valueType() {
    return constants.attributeValueType.PASSWORD_ALGORITHM;
  }

  /**
   * Set attribute value.
   * @param {{ algorithm: number, params?: Buffer }} value
   * @returns {boolean}
   */
  setValue({ algorithm, params = Buffer.alloc(0) }) {
    if (!Number.isInteger(algorithm)) return false;
    this.#algorithm = algorithm;
    this.#params = Buffer.isBuffer(params) ? params : Buffer.alloc(0);
    return true;
  }

  /**
   * Encode to buffer (raw value, without the outer STUN attribute header).
   * @returns {Buffer}
   */
  toBuffer() {
    const buf = Buffer.alloc(4 + this.#params.length);
    buf.writeUInt16BE(this.#algorithm, 0);
    buf.writeUInt16BE(this.#params.length, 2);
    this.#params.copy(buf, 4);
    return buf;
  }
};
