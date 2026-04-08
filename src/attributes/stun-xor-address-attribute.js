'use strict';

const net = require('net');
const ipa = require('ipaddr.js');
const { pton4, pton6 } = require('ip2buf');
const constants = require('../lib/constants');
const StunAddressAttribute = require('./stun-address-attribute');

/**
 * This class implements STUN attribute for XORed ip address and port.
 */
module.exports = class StunXorAddressAttribute extends StunAddressAttribute {
  #owner = null;

  /**
   * @class StunXorAddressAttribute
   * @param {number} type Attribute type.
   * @param {string} address IP address.
   * @param {number} port
   */
  constructor(type, address, port) {
    super(type, address, port);
  }

  /**
   * Create `StunXorAddressAttribute` instance from buffer.
   * @param {number} type
   * @param {Buffer} message
   * @param {StunMessage} owner
   * @returns {StunXorAddressAttribute}
   */
  static from(type, message, owner) {
    const packet = StunAddressAttribute.decode(message);

    const port = xorPort(packet.port);
    const address = xorIP(ipa.fromByteArray(packet.address).toString(), owner);

    const attribute = new StunXorAddressAttribute(type, address, port);

    attribute.setOwner(owner);
    return attribute;
  }

  /**
   * Get type of an attribute value.
   * @returns {number}
   */
  get valueType() {
    return constants.attributeValueType.XOR_ADDRESS;
  }

  /**
   * @private
   * @param {StunMessage} owner
   */
  setOwner(owner) {
    this.#owner = owner;
  }

  /**
   * Return XORed values.
   * @returns {Object}
   * @private
   */
  writeValue() {
    const packet = this.value;

    packet.port = xorPort(packet.port);

    if (this.#owner !== null) {
      packet.address = xorIP(packet.address, this.#owner);
    }

    return packet;
  }
};

/**
 * XOR two buffers, zero-padding the shorter one.
 * @param {Buffer} a
 * @param {Buffer} b
 * @returns {Buffer}
 */
function xor(a, b) {
  const buf = Buffer.alloc(Math.max(a.length, b.length), 0);
  for (let i = 0; i < buf.length; i++) buf[i] = (a[i] ?? 0) ^ (b[i] ?? 0);
  return buf;
}

/**
 * Get XORed port.
 * @param {number} port
 * @returns {number}
 */
function xorPort(port) {
  return port ^ (constants.kStunMagicCookie >> 16);
}

/**
 * @param {string} address
 * @param {StunMessage} owner
 * @returns {string}
 */
function xorIP(address, owner) {
  let xored;

  if (net.isIPv4(address)) {
    xored = xor(pton4(address), constants.kStunMagicCookieBuffer);
  } else if (net.isIPv6(address)) {
    xored = xor(pton6(address), Buffer.concat([constants.kStunMagicCookieBuffer, owner.transactionId]));
  } else {
    throw new Error(`Invalid ip address: ${address}`);
  }

  return ipa.fromByteArray(xored).toString();
}
