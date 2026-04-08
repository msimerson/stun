'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const StunXorAddressAttribute = require('../../src/attributes/stun-xor-address-attribute');
const constants = require('../../src/lib/constants');

const type = constants.attributeType.XOR_MAPPED_ADDRESS;

test('encode ipv4', () => {
  const attribute = new StunXorAddressAttribute(type, '192.168.1.35', 63524);

  const owner = {
    transactionId: Buffer.from('d00558707bb8cc6a633a9df7', 'hex'),
  };

  attribute.setOwner(owner);

  assert.deepEqual(attribute.value, {
    address: '192.168.1.35',
    port: 63524,
    family: 'IPv4',
  });

  const expectedBuffer = Buffer.from('0001d936e1baa561', 'hex');
  assert.deepEqual(attribute.toBuffer(), expectedBuffer);
});

test('encode ipv6', () => {
  const attribute = new StunXorAddressAttribute(type, 'fe80::1', 63524);

  const owner = {
    transactionId: Buffer.from('d00558707bb8cc6a633a9df7', 'hex'),
  };

  attribute.setOwner(owner);

  assert.deepEqual(attribute.value, {
    address: 'fe80::1',
    port: 63524,
    family: 'IPv6',
  });

  const expectedBuffer = Buffer.from('0002d936df92a442d00558707bb8cc6a633a9df6', 'hex');
  assert.deepEqual(attribute.toBuffer(), expectedBuffer);
});
