'use strict';

const Emitter = require('events');
const StunRequest = require('../message/request');
const decode = require('../message/decode');
const constants = require('../lib/constants');
const { StunMessageError, StunResponseError } = require('../lib/errors');

const {
  eventNames: {
    EVENT_BINDING_RESPONSE,
    EVENT_BINDING_INDICATION,
    EVENT_BINDING_REQUEST,
    EVENT_BINDING_ERROR_RESPONSE,
  },
} = constants;

const isStunRequest = 0;
const isStunIndication = 0x010;
const isStunSuccessResponse = 0x100;
const isStunErrorResponse = 0x110;

const STUN_MIN_LENGTH = 20;
const isStun = (msg) =>
  Buffer.isBuffer(msg) &&
  msg.length >= STUN_MIN_LENGTH &&
  msg[0] <= 3 &&
  msg.readUInt32BE(4) === constants.kStunMagicCookie;

// This class implements a STUN server.
module.exports = class StunServer extends Emitter {
  #socket;
  #handleMessage;
  #handleClose;
  #handleListening;

  /**
   * @class StunServer
   * @param {dgram.Socket} socket
   */
  constructor(socket) {
    super();

    this.#socket = socket;
    this.#handleMessage = this.#onMessage.bind(this);
    this.#handleClose = this.close.bind(this);
    this.#handleListening = () => this.emit('listening');

    socket.on('message', this.#handleMessage);
    socket.once('close', this.#handleClose);
    socket.once('listening', this.#handleListening);
  }

  get #closed() {
    return this.#socket === null;
  }

  /**
   * Handles arrived STUN messages.
   * @param {Buffer} message
   * @param {Object} rinfo
   */
  process(message, rinfo) {
    let stunMessage;

    try {
      stunMessage = decode(message);
    } catch {
      this.emit('error', new StunMessageError(message, rinfo));
      return;
    }

    switch (stunMessage.type & constants.kStunTypeMask) {
      case isStunRequest:
        this.emit(EVENT_BINDING_REQUEST, stunMessage, rinfo);
        break;
      case isStunIndication:
        this.emit(EVENT_BINDING_INDICATION, stunMessage, rinfo);
        break;
      case isStunSuccessResponse:
        this.emit(EVENT_BINDING_RESPONSE, stunMessage, rinfo);
        break;
      case isStunErrorResponse:
        this.emit(EVENT_BINDING_ERROR_RESPONSE, stunMessage, rinfo);
        this.emit('error', new StunResponseError(stunMessage, rinfo));
        break;
      default:
        break;
    }
  }

  /**
   * @param {Buffer} message
   * @param {Object} rinfo
   */
  #onMessage(message, rinfo) {
    if (!isStun(message)) {
      return;
    }

    this.process(message, rinfo);
  }

  /**
   * Start listening on `port` and optional `address`.
   * @param {number} port
   * @param {string} [address]
   * @param {Function} [callback]
   */
  listen(port, address, callback) {
    if (typeof address === 'function') {
      callback = address;
      address = undefined;
    }

    if (typeof callback === 'function') {
      this.once('listening', callback);
    }

    this.#socket.bind(port, address);
  }

  /**
   * Sends the StunMessage message.
   * @param {StunRequest} request
   * @param {number} port Remote port.
   * @param {string} address Remote address.
   * @param {Function} [callback]
   * @returns {bool}
   */
  send(request, port, address, callback) {
    if (this.#closed) {
      return false;
    }

    if (!(request instanceof StunRequest)) {
      return false;
    }

    this.#socket.send(request.toBuffer(), port, address, callback);
    return true;
  }

  /**
   * Close a STUN server.
   */
  close() {
    if (this.#closed) {
      return;
    }

    this.#socket.removeListener('message', this.#handleMessage);
    this.#socket.removeListener('close', this.#handleClose);
    this.#socket.removeListener('listening', this.#handleListening);

    this.#socket = null;
    this.emit('close');
  }
};
