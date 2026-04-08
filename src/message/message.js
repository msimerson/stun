'use strict';

const constants = require('../lib/constants');

const { kStunTransactionIdLength } = constants;

const EMPTY_TRANSACTION_ID = Buffer.alloc(kStunTransactionIdLength, 0);

/**
 * Base class for a STUN message.
 */
module.exports = class StunMessage {
  #type = 0;
  #transactionId = EMPTY_TRANSACTION_ID;
  #cookie = constants.kStunMagicCookie;
  #attributes = [];

  // Protected accessors for StunRequest (subclass) and package internals
  // (decode.js, encode.js). Not part of the public API.
  get _type() {
    return this.#type;
  }
  set _type(v) {
    this.#type = v;
  }
  get _transactionId() {
    return this.#transactionId;
  }
  set _transactionId(v) {
    this.#transactionId = v;
  }
  get _cookie() {
    return this.#cookie;
  }
  get _attributes() {
    return this.#attributes;
  }
  set _attributes(v) {
    this.#attributes = v;
  }

  /**
   * Populate fields from a decoded packet header and parsed attribute list.
   * Used by decode.js — not part of the public API.
   * @param {Object} header
   * @param {StunAttribute[]} parsedAttributes
   */
  _initFromPacket(header, parsedAttributes) {
    this.#type = header.type;
    this.#transactionId = header.transaction;
    this.#cookie = header.cookie;
    this.#attributes = parsedAttributes;
  }

  /**
   * Get the type of the message.
   * @returns {number}
   */
  get type() {
    return this.#type;
  }

  /**
   * Get transaction id field.
   * @returns {Buffer}
   */
  get transactionId() {
    return this.#transactionId;
  }

  /**
   * Returns true if the message confirms to RFC3489 rather than RFC5389.
   * @returns {boolean} The result of an operation.
   */
  isLegacy() {
    return this.#cookie !== constants.kStunMagicCookie;
  }

  /**
   * Get the number of an attributes in the message.
   * @returns {number} The number of an attributes in the message.
   */
  get count() {
    return this.#attributes.length;
  }

  /**
   * Return a STUN attribute by it type or undefined.
   * @param {number} type - Attribute type.
   * @returns {StunAttribute|undefined} Instance of StunAttribute or undefined attribute doesn't exist.
   */
  getAttribute(type) {
    return this.#attributes.find((attribute) => attribute.type === type);
  }

  /**
   * Check if attribute exist.
   * @param {number} type
   * @returns {boolean}
   */
  hasAttribute(type) {
    return this.getAttribute(type) !== undefined;
  }

  /**
   * Iterator over attributes.
   */
  *[Symbol.iterator]() {
    for (const attribute of this.#attributes) {
      yield attribute;
    }
  }
};
