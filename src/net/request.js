'use strict';

const debug = process.env.DEBUG?.includes('stun')
  ? (...args) => console.error('[stun:request]', ...args)
  : () => {};
const StunServer = require('../net/dgram-server');
const StunRequest = require('../message/request');
const { messageType, eventNames } = require('../lib/constants');
const { createServer } = require('../net/create-server');
const { createMessage } = require('../lib/create-message');

module.exports = { request };

/**
 * @typedef {Object} RequestOptions
 * @property {StunServer} [server] - Existing StunServer to reuse.
 * @property {dgram.Socket} [socket] - Existing UDP socket to bind.
 * @property {StunRequest} [message] - Custom STUN message to send.
 * @property {number} [timeout] - Initial RTO in ms (default 500).
 * @property {number} [maxTimeout] - Maximum RTO in ms (default Infinity).
 * @property {number} [retries] - Maximum retry count (default 6).
 */

const defaultRetryOptions = {
  retries: 6,
  timeout: 500,
  maxTimeout: Infinity,
};

/**
 * Send a STUN binding request and resolve with the response.
 * @param {string} url
 * @param {RequestOptions} [options]
 * @returns {Promise<StunResponse>}
 */
async function request(url, options = {}) {
  const { port, protocol, hostname } = new URL(/:\/\//.test(url) ? url : `stun://${url}`);

  if (protocol !== 'stun:') {
    throw new Error(`Invalid protocol '${protocol}'`);
  }

  const externalServer = options.server instanceof StunServer;
  const server = externalServer
    ? options.server
    : createServer({ type: 'udp4', socket: options.socket });

  const message =
    options.message instanceof StunRequest
      ? options.message
      : createMessage(messageType.BINDING_REQUEST);

  debug(externalServer ? 'use external server' : 'create server');
  debug(
    options.message instanceof StunRequest
      ? 'use external message'
      : 'create BINDING_REQUEST message',
  );
  debug('start request to %s:%s', hostname, port || 3478);

  const retryOptions = { ...defaultRetryOptions, ...options };

  try {
    return await sendWithRetry(server, message, Number(port) || 3478, hostname, retryOptions);
  } finally {
    if (!externalServer) {
      debug('close server');
      server.close();
    }
  }
}

/**
 * Send message with exponential backoff, resolving on first valid response.
 * @param {StunServer} server
 * @param {StunRequest} message
 * @param {number} port
 * @param {string} hostname
 * @param {Object} options
 * @returns {Promise<StunResponse>}
 */
function sendWithRetry(server, message, port, hostname, options) {
  return new Promise((resolve, reject) => {
    const retrier = () => {
      debug('send message');
      server.send(message, port, hostname);
    };

    const done = retry(retrier, options, (error, result) => {
      cleanup();
      if (error) reject(error);
      else resolve(result);
    });

    server.on(eventNames.EVENT_BINDING_RESPONSE, onResponse);
    server.on('error', onError);

    function onError(error) {
      debug('got stun error %s', error.message);
      done(error);
    }

    function onResponse(response) {
      debug('got response');
      if (Buffer.compare(message.transactionId, response.transactionId) !== 0) {
        debug('invalid transaction id, skip');
        return;
      }
      debug('success');
      done(null, response);
    }

    function cleanup() {
      debug('clean up');
      server.removeListener('error', onError);
      server.removeListener(eventNames.EVENT_BINDING_RESPONSE, onResponse);
    }
  });
}

/**
 * Exponential backoff retry.
 * @param {Function} fn - Function to call on each attempt.
 * @param {Object} options
 * @param {number} options.timeout - Initial RTO in ms.
 * @param {number} options.maxTimeout - Maximum RTO in ms.
 * @param {number} options.retries - Maximum number of retries.
 * @param {Function} callback - Called with (error, result) when done.
 * @returns {Function} done — call to cancel and deliver an early result.
 */
function retry(fn, options, callback) {
  let handle;
  debug('retry options %o', options);

  function done(error, result) {
    if (handle) clearTimeout(handle);
    debug('done');
    callback(error, result);
  }

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

    const rto = options.timeout * (2 ** (count - 1));
    const timeout = Math.min(rto, options.maxTimeout);
    debug('start timer %s (rto = %s)', timeout, rto);

    if (count > options.retries) {
      debug('max retries %s / %s', count - 1, options.retries);
      handle = setTimeout(() => done(new Error('timeout')), timeout);
    } else {
      handle = setTimeout(next, timeout);
    }
  }

  attempt(0);
  return done;
}
