'use strict';

const binary = require('binary-data');
const { StunMessagePacket, StunAttributePacket } = require('../lib/protocol');

const {
  types: { array },
} = binary;

module.exports = encode;

/**
 * Encode the StunMessage to a Buffer.
 * @param {StunMessage} message
 * @returns {Buffer}
 */
function encode(message) {
  const ostream = binary.createEncode();

  const attributes = message._attributes.map((attribute) => ({
    type: attribute.type,
    value: attribute.toBuffer(),
  }));

  const packet = {
    header: {
      type: message.type,
      length: binary.encodingLength(
        attributes,
        array(StunAttributePacket, attributes.length),
      ),
      cookie: message._cookie,
      transaction: message.transactionId,
    },
    attributes,
  };

  binary.encode(packet, ostream, StunMessagePacket);
  return ostream.slice();
}
