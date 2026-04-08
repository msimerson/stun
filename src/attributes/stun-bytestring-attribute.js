'use strict';

const {
  encode,
  types: { buffer },
} = require('binary-data');
const constants = require('../lib/constants');
const StunAttribute = require('./stun-attribute');

/**
 * This class implements STUN attribute for strings and buffers.
 */
module.exports = class StunByteStringAttribute extends StunAttribute {
  #value = null;

  /**
   * @class StunByteStringAttribute
   * @param {number} type Attribute type.
   * @param {string|Buffer} value
   * @param {string} encoding
   */
  constructor(type, value, encoding = 'utf8') {
    super(type);

    this.setValue(value, encoding);
  }

  /**
   * Create `StunByteStringAttribute` instance from buffer.
   * @param {number} type
   * @param {Buffer} message
   * @returns {StunByteStringAttribute}
   */
  static from(type, message) {
    return new StunByteStringAttribute(type, message);
  }

  /**
   * Get attribute value.
   */
  get value() {
    return this.#value;
  }

  /**
   * Get type of an attribute value.
   * @returns {number}
   */
  get valueType() {
    return constants.attributeValueType.BYTE_STRING;
  }

  /**
   * Set attribute value.
   * @param {string|Buffer} value
   * @param {string} encoding
   * @returns {bool}
   */
  setValue(value, encoding = 'utf8') {
    if (Buffer.isBuffer(value)) {
      this.#value = value;
      return true;
    }

    if (typeof value === 'string') {
      this.#value = Buffer.from(value, encoding);
      return true;
    }

    return false;
  }

  /**
   * @private
   * @param {EncodeStream} encodeStream
   * @returns {bool}
   */
  write(encodeStream) {
    if (!this.value) {
      return false;
    }

    encode(this.value, encodeStream, buffer(this.value.length));
    return true;
  }
};
