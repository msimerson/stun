'use strict';

const { attributeType } = require('./constants');

/**
 * Base class for STUN errors.
 */
class StunError extends Error {
  #packet;
  #sender;

  /**
   * @class StunError
   * @param {string} message Error message.
   * @param {Buffer|StunMessage} packet Arrived data.
   * @param {Object} sender
   */
  constructor(message, packet, sender) {
    super(message);

    this.name = 'StunError';
    this.#packet = packet;
    this.#sender = sender;
  }

  /**
   * Get the pinned packet.
   * @returns {Buffer|StunMessage|undefined}
   */
  get packet() {
    return this.#packet;
  }

  /**
   * Get remote info.
   * @returns {Object|undefined}
   */
  get sender() {
    return this.#sender;
  }
}

/**
 * Error class for invalid arrived messages.
 */
class StunMessageError extends StunError {
  /**
   * @class StunMessageError
   * @param {Buffer|StunMessage} packet Arrived data.
   * @param {Object} sender
   */
  constructor(packet, sender) {
    super('Invalid message', packet, sender);

    this.name = 'StunMessageError';
  }
}

/**
 * Error class to represent errors in STUN responses.
 */
class StunResponseError extends StunError {
  /**
   * @class StunResponseError
   * @param {StunMessage} packet Arrived data.
   * @param {Object} sender
   */
  constructor(packet, sender) {
    const error = packet.getAttribute(attributeType.ERROR_CODE);
    const message = error !== undefined ? error.reason : 'Unknown error';

    super(message, packet, sender);

    this.name = 'StunResponseError';

    if (error !== undefined) {
      this.code = error.code;
    }
  }
}

module.exports = {
  StunError,
  StunMessageError,
  StunResponseError,
};
