'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const Emitter = require('events');
const Server = require('../../src/net/dgram-server');
const { StunMessageError, StunResponseError } = require('../../src/lib/errors');
const { messageType } = require('../../src/lib/constants');
const { createMessage } = require('../../src/lib/create-message');

function mockFn() {
  const fn = function (...args) {
    fn.calls.push(args);
  };
  fn.calls = [];
  return fn;
}

/**
 * Create fake udp socket.
 * @returns {Object}
 */
function socket() {
  return {
    on() {},
    once() {},
  };
}

test('do not throw exception on invalid message', () => {
  const server = new Server(socket());
  const message = Buffer.from([2, 0xff]);

  server.emit = mockFn();

  server.process(message, {});

  const lastCall = server.emit.calls[server.emit.calls.length - 1];
  assert.equal(lastCall[0], 'error');
  assert.deepEqual(lastCall[1], new StunMessageError(message, {}));
});

test('emit StunResponseError for an error messages', () => {
  const server = new Server(socket());
  server.emit = mockFn();

  const message = createMessage();

  message.setType(messageType.BINDING_ERROR_RESPONSE);
  message.addError(300, 'hello world');

  server.process(message.toBuffer(), {});

  const lastCall = server.emit.calls[server.emit.calls.length - 1];
  assert.equal(lastCall[0], 'error');
  assert.equal(lastCall[1] instanceof StunResponseError, true);
  assert.equal(lastCall[1].message, 'hello world');
  assert.equal(lastCall[1].code, 300);
});

test('should listen', () => {
  const sock = socket();
  sock.bind = mockFn();

  const server = new Server(sock);
  server.once = mockFn();

  server.listen(123);
  assert.deepEqual(sock.bind.calls[sock.bind.calls.length - 1], [123, undefined]);

  server.listen(123, 'localhost');
  assert.deepEqual(sock.bind.calls[sock.bind.calls.length - 1], [123, 'localhost']);

  const callback = mockFn();
  server.listen(123, 'localhost', callback);
  assert.deepEqual(sock.bind.calls[sock.bind.calls.length - 1], [123, 'localhost']);
  assert.deepEqual(server.once.calls[server.once.calls.length - 1], ['listening', callback]);
});

test('should call callbacks for `listening`', () => {
  const sock = socket();
  sock.bind = mockFn();

  const server = new Server(sock);

  const callback = mockFn();
  server.listen(123, 'localhost', callback);

  server.emit('listening');
  assert.equal(callback.calls.length, 1);
});

test('should emit `listening` event', () => {
  const sock = new Emitter();
  const server = new Server(sock);
  server.emit = mockFn();

  sock.emit('listening');
  assert.deepEqual(server.emit.calls[0], ['listening']);

  sock.emit('listening');
  assert.equal(server.emit.calls.length, 1);
});
