'use strict';

const constants = require('../lib/constants');
const StunAttribute = require('./stun-attribute');

/**
 * This class implements the RFC 8489 PASSWORD-ALGORITHMS attribute (0x8002).
 *
 * The value is a list of algorithm entries. Each entry is individually padded
 * to a 4-byte boundary within the value buffer:
 *
 *   0                   1                   2                   3
 *   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |         Algorithm 1           | Algorithm 1 Parameters Length |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |                Algorithm 1 Parameters (variable)              |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |         Algorithm 2           | Algorithm 2 Parameters Length |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *   |                Algorithm 2 Parameters (variable)              |
 *   +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 */
module.exports = class StunPasswordAlgorithmsAttribute extends StunAttribute {
  #algorithms;

  /**
   * @param {number} type Attribute type.
   * @param {Array<{algorithm: number, params?: Buffer}>} algorithms
   */
  constructor(type, algorithms = []) {
    super(type);
    this.#algorithms = algorithms.map(normalizeEntry);
  }

  /**
   * Create instance from a raw value buffer (used during decode).
   * @param {number} type
   * @param {Buffer} value
   * @param {object} owner
   * @returns {StunPasswordAlgorithmsAttribute}
   */
  static from(type, value, owner) {
    const algorithms = [];
    let offset = 0;

    while (offset + 4 <= value.length) {
      const algorithm = value.readUInt16BE(offset);
      const paramsLength = value.readUInt16BE(offset + 2);
      const params = value.subarray(offset + 4, offset + 4 + paramsLength);
      algorithms.push({ algorithm, params });

      // Each entry is padded to a 4-byte boundary.
      const entrySize = 4 + paramsLength;
      const paddedSize = entrySize + ((4 - (entrySize % 4)) % 4);
      offset += paddedSize;
    }

    const attr = new StunPasswordAlgorithmsAttribute(type, algorithms);
    attr.setOwner(owner);
    return attr;
  }

  /**
   * Get attribute value.
   * @returns {Array<{algorithm: number, params: Buffer}>}
   */
  get value() {
    return this.#algorithms;
  }

  /**
   * Get type of attribute value.
   * @returns {number}
   */
  get valueType() {
    return constants.attributeValueType.PASSWORD_ALGORITHMS;
  }

  /**
   * Set attribute value.
   * @param {Array<{algorithm: number, params?: Buffer}>} algorithms
   * @returns {boolean}
   */
  setValue(algorithms) {
    if (!Array.isArray(algorithms)) return false;
    this.#algorithms = algorithms.map(normalizeEntry);
    return true;
  }

  /**
   * Encode to buffer (raw value with per-entry padding, without outer STUN attribute header).
   * @returns {Buffer}
   */
  toBuffer() {
    const parts = [];

    for (const { algorithm, params } of this.#algorithms) {
      const entrySize = 4 + params.length;
      const paddedSize = entrySize + ((4 - (entrySize % 4)) % 4);
      const buf = Buffer.alloc(paddedSize, 0);
      buf.writeUInt16BE(algorithm, 0);
      buf.writeUInt16BE(params.length, 2);
      params.copy(buf, 4);
      parts.push(buf);
    }

    return Buffer.concat(parts);
  }
};

function normalizeEntry({ algorithm, params = Buffer.alloc(0) }) {
  return { algorithm, params: Buffer.isBuffer(params) ? params : Buffer.alloc(0) };
}
