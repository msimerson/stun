'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const encode = require('../../src/message/encode');
const { messageType, attributeType } = require('../../src/lib/constants');
const StunRequest = require('../../src/message/request');
const StunResponse = require('../../src/message/response');
const attributes = require('../../src/lib/attributes');

test('should encode request', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_REQUEST);
  message.setTransactionId(Buffer.from('d00558707bb8cc6a633a9df7', 'hex'));
  message.addAttribute(attributeType.XOR_MAPPED_ADDRESS, '192.168.1.35', 63524);

  const expectedBuffer = Buffer.from([
    0, 0x01 /* Type */, 0, 12 /* Length */, 0x21, 0x12, 0xa4, 0x42 /* Cookie */, 0xd0,
    0x05, 0x58, 0x70, 0x7b, 0xb8, 0xcc, 0x6a, 0x63, 0x3a, 0x9d, 0xf7 /* Transaction */, 0,
    0x20 /* XOR_MAPPED_ADDRESS */, 0, 8 /* Length */, 0 /* Reserved */, 0x1 /* Family */,
    0xd9, 0x36 /* Port */, 0xe1, 0xba, 0xa5, 0x61 /* Ip */,
  ]);

  assert.deepEqual(encode(message), expectedBuffer);
});

test('should encode response', () => {
  const message = new StunResponse();

  const txId = Buffer.from('d00558707bb8cc6a633a9df7', 'hex');
  const attribute = attributes.create(
    attributeType.XOR_MAPPED_ADDRESS,
    '192.168.1.35',
    63524,
  );
  attribute.setOwner(message);

  message._initFromPacket(
    { type: messageType.BINDING_REQUEST, transaction: txId, cookie: 0x2112a442 },
    [attribute],
  );

  const expectedBuffer = Buffer.from([
    0, 0x01 /* Type */, 0, 12 /* Length */, 0x21, 0x12, 0xa4, 0x42 /* Cookie */, 0xd0,
    0x05, 0x58, 0x70, 0x7b, 0xb8, 0xcc, 0x6a, 0x63, 0x3a, 0x9d, 0xf7 /* Transaction */, 0,
    0x20 /* XOR_MAPPED_ADDRESS */, 0, 8 /* Length */, 0 /* Reserved */, 0x1 /* Family */,
    0xd9, 0x36 /* Port */, 0xe1, 0xba, 0xa5, 0x61 /* Ip */,
  ]);

  assert.deepEqual(encode(message), expectedBuffer);
});
