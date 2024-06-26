'use strict';

const debug = require('debug')('stun:request');
const { fromCallback } = require('universalify');
const StunServer = require('../net/dgram-server');
const StunRequest = require('../message/request');
const { messageType, eventNames } = require('../lib/constants');
const { createServer } = require('../net/create-server');
const { createMessage } = require('../lib/create-message');

module.exports = {
  request: fromCallback(request),
};

/**
 * @typedef {Object} RequestOptions
 * @property {StunServer} [server]
 * @property {dgram.Socket} [socket]
 * @property {StunRequest} [message]
 * @property {number} [timeout] Initial RTO.
 * @property {number} [maxTimeout] Maximal RTO.
 * @property {number} [retries] Maximal the number of retries.
 */

const defaultRetryOptions = {
  retries: 6,
  timeout: 500,
  maxTimeout: Infinity,
};

/**
 * Send a stun binding request to resolve ip address.
 * @param {string} url
 * @param {RequestOptions} [options]
 * @param {Function} callback
 */
function request(url, options = {}, callback) {
  if (typeof options === 'function') {
    callback = options; // eslint-disable-line no-param-reassign
    options = {}; // eslint-disable-line no-param-reassign
  }

  // if no proto, prepend stun://
  const { port, protocol, hostname } = new URL(/:\/\//.test(url) ? url : `stun://${url}`);

  if (protocol !== 'stun:') {
    process.nextTick(callback, new Error(`Invalid protocol '${protocol}'`));
    return;
  }

  debug('start request to %s:%s', hostname, port || 3478);

  let server;
  let message;
  let externalServer = false;

  if (options.server instanceof StunServer) {
    debug('use external server');
    server = options.server; // eslint-disable-line prefer-destructuring
    externalServer = true;
  } else {
    debug('create server');
    const { socket } = options;
    server = createServer({ type: 'udp4', socket });
  }

  if (options.message instanceof StunRequest) {
    debug('use external message');
    message = options.message; // eslint-disable-line prefer-destructuring
  } else {
    debug('create BINDING_REQUEST message');
    message = createMessage(messageType.BINDING_REQUEST);
  }

  const retrier = () => {
    debug('send message');
    server.send(message, port || 3478, hostname);
  };

  const retryOptions = Object.assign({}, defaultRetryOptions, options);
  const done = retry(retrier, retryOptions, (error, result) => {
    cleanup();
    process.nextTick(callback, error, result);
  });

  server.on(eventNames.EVENT_BINDING_RESPONSE, onResponse);
  server.on('error', onError);

  /**
   * Error handler.
   * @param {Error} error
   */
  function onError(error) {
    // check stun err for transation

    debug('got stun error %s', error.message);
    done(error);
  }

  /**
   * Handle incoming binding_response messages.
   * @param {StunResponse} response
   */
  function onResponse(response) {
    debug('got response');
    if (Buffer.compare(message.transactionId, response.transactionId) !== 0) {
      debug('invalid transaction id, skip');
      return;
    }

    debug('success');
    done(null, response);
  }

  /**
   * Remove request's handlers.
   */
  function cleanup() {
    debug('clean up');
    server.removeListener('error', onError);
    server.removeListener(eventNames.EVENT_BINDING_RESPONSE, onResponse);

    if (!externalServer) {
      debug('close server');
      server.close();
    }
  }
}

/**
 *
 * @param {Function} fn
 * @param {Object} options
 * @param {number} options.timeout Initial RTO.
 * @param {number} options.maxTimeout Maximal RTO.
 * @param {number} options.retries Maximal the number of retries.
 * @param {Function} callback
 * @returns {Function}
 */
function retry(fn, options, callback) {
  let handle;
  debug('retry options %o', options);

  /**
   * Clean up.
   * @param {Error} error
   * @param {Object} result
   */
  function done(error, result) {
    if (handle) {
      clearTimeout(handle);
    }

    debug('done');
    callback(error, result);
  }

  /**
   * Runner.
   * @param {number} count
   */
  function attempt(count) {
    const next = () => {
      debug('attempt %s', count);
      fn();
      attempt(count + 1);
    };

    if (count === 0) {
      process.nextTick(next);
      return;
    }

    const retries = count - 1;
    const rto = options.timeout << retries; // eslint-disable-line no-bitwise
    const timeout = Math.min(rto, options.maxTimeout);
    debug('start timer %s (rto = %s)', timeout, rto);

    if (count > options.retries) {
      debug('max retries %s / %s', retries, options.retries);
      handle = setTimeout(() => done(new Error('timeout')), timeout);
    } else {
      handle = setTimeout(next, timeout);
    }
  }

  attempt(0);
  return done;
}
