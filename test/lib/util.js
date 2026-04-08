'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createMessageType } = require('../../src/lib/util');
const { classType, methods } = require('../../src/lib/constants');

test('createMessageType', () => {
  const BINDING_REQUEST = 0x0001;
  const BINDING_INDICATION = 0x0011;
  const BINDING_RESPONSE = 0x0101;
  const BINDING_ERROR_RESPONSE = 0x0111;

  // First 4 bits.
  assert.equal(createMessageType(methods.BINDING, classType.REQUEST), BINDING_REQUEST);
  assert.equal(
    createMessageType(methods.BINDING, classType.INDICATION),
    BINDING_INDICATION,
  );
  assert.equal(createMessageType(methods.BINDING, classType.RESPONSE), BINDING_RESPONSE);
  assert.equal(
    createMessageType(methods.BINDING, classType.ERROR),
    BINDING_ERROR_RESPONSE,
  );

  // Bits 4 - 6.
  assert.equal(createMessageType(0b11111, classType.ERROR), 0b100111111);

  // Bits 7 - 11.
  assert.equal(createMessageType(0x02ff, classType.ERROR), 0b101111111111);
});
