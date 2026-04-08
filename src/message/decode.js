'use strict';

const binary = require('binary-data');
const StunResponse = require('./response');
const { StunMessagePacket } = require('../lib/protocol');
const attributes = require('../lib/attributes');

const kMessageType = Symbol.for('kMessageType');
const kTransactionId = Symbol.for('kTransctionId');
const kCookie = Symbol.for('kCookie');
const kAttributes = Symbol.for('kAttributes');

module.exports = decode;

/**
 * Decode the Buffer into the StunResponse.
 * @param {Buffer} message
 * @returns {StunResponse}
 */
const STUN_MIN_LENGTH = 20;
const STUN_MAX_LENGTH = 65535;

function decode(message) {
  if (!Buffer.isBuffer(message) || message.length < STUN_MIN_LENGTH || message.length > STUN_MAX_LENGTH) {
    throw new RangeError('Invalid STUN message length');
  }

  const packet = binary.decode(message, StunMessagePacket);

  const response = new StunResponse();

  response[kMessageType] = packet.header.type;
  response[kTransactionId] = packet.header.transaction;
  response[kCookie] = packet.header.cookie;

  response[kAttributes] = packet.attributes.map((attribute) =>
    attributes.parse(attribute, response),
  );

  return response;
}
