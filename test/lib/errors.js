'use strict';

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { StunMessageError, StunResponseError } = require('../../src/lib/errors');
const { messageType } = require('../../src/lib/constants');
const { createMessage } = require('../../src/lib/create-message');

test('should use ERROR-CODE attribute for StunResponseError', () => {
  const message = createMessage();

  message.setType(messageType.BINDING_ERROR_RESPONSE);
  message.addError(300, 'hello world');

  const error = new StunResponseError(message, {});

  assert.equal(error.message, 'hello world');
  assert.equal(error.code, 300);
  assert.equal(error.packet, message);
  assert.equal(error.name, 'StunResponseError');
  assert.deepEqual(error.sender, {});
});

test('should use fallback if ERROR-CODE attribute missed', () => {
  const message = createMessage();

  message.setType(messageType.BINDING_ERROR_RESPONSE);

  const error = new StunResponseError(message, {});

  assert.equal(error.message, 'Unknown error');
  assert.equal(error.code, undefined);
  assert.equal(error.packet, message);
  assert.equal(error.name, 'StunResponseError');
  assert.deepEqual(error.sender, {});
});

test('StunMessageError', () => {
  const message = Buffer.alloc(0);
  const error = new StunMessageError(message, {});

  assert.equal(error.message, 'Invalid message');
  assert.equal(error.packet, message);
  assert.equal(error.name, 'StunMessageError');
  assert.deepEqual(error.sender, {});
});
