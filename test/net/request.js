'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { request } = require('../../src/net/request');
const StunResponse = require('../../src/message/response');
const { createMessage } = require('../../src/lib/create-message');
const { messageType } = require('../../src/lib/constants');
const StunServer = require('../../src/net/dgram-server');
const { createServer } = require('../../src/net/create-server');

test('should work', async () => {
  const res = await request('stun://stun.l.google.com:19302');
  assert.equal(true, res instanceof StunResponse);
});

test('should work as promise', async () => {
  const res = await request('stun://stun.l.google.com:19302');
  assert.equal(true, res instanceof StunResponse);
});

test('url normalization should work', async () => {
  const res = await request('stun.l.google.com:19302');
  assert.equal(true, res instanceof StunResponse);
});

test('should use provided STUN server', async () => {
  const socket = {
    on: function () {},
    once: function () {},
    removeListener: function () {},
  };
  const server = new StunServer(socket);
  let called = 0;
  server.send = function () {
    called++;
  };

  await assert.rejects(
    request('stun.l.google.com:19302', { server, retries: 0 }),
    /timeout/,
  );
  assert.equal(called, 1);
});

test('should use provided message', async () => {
  const server = createServer({ type: 'udp4' });
  const message = createMessage(messageType.BINDING_REQUEST);

  try {
    const res = await request('stun.l.google.com:19302', { server, retries: 0, message });
    assert.deepEqual(res.transactionId, message.transactionId);
  } finally {
    server.close();
  }
});
