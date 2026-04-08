'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const StunErrorCodeAttribute = require('../../src/attributes/stun-error-code-attribute');
const constants = require('../../src/lib/constants');

const type = constants.attributeType.ERROR_CODE;
const code = constants.errorCode.TRY_ALTERNATE;
const reason = constants.errorReason.TRY_ALTERNATE;

test('encode', () => {
  const attribute = new StunErrorCodeAttribute(type, code, reason);

  const header = Buffer.from([0, 0, 3, code % 100]);

  const expectedBuffer = Buffer.concat([header, Buffer.from(reason)]);

  assert.equal(attribute.errorClass, 3);
  assert.equal(attribute.code, code);
  assert.equal(attribute.reason, reason);
  assert.deepEqual(attribute.value, {
    code,
    reason,
  });
  assert.deepEqual(attribute.toBuffer(), expectedBuffer);
});

test('decode', () => {
  const header = Buffer.from([0, 0, 3, code % 100]);

  const message = Buffer.concat([header, Buffer.from(reason)]);
  const attribute = StunErrorCodeAttribute.from(type, message);

  assert.equal(attribute.errorClass, 3);
  assert.equal(attribute.code, code);
  assert.equal(attribute.reason, reason);
  assert.deepEqual(attribute.value, {
    code,
    reason,
  });
});

test('decode formula: errorClass * 100 + code', () => {
  // errorClass=4 (UNAUTHORIZED class), code=1 → must produce 401, not 4*(1+100)=404
  const header = Buffer.from([0, 0, 4, 1]);
  const attribute = StunErrorCodeAttribute.from(
    type,
    Buffer.concat([header, Buffer.alloc(0)]),
  );

  assert.equal(attribute.code, 401);
  assert.equal(attribute.errorClass, 4);
});
