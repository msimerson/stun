'use strict';

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');

const constants = require('../../src/lib/constants');
const StunAttribute = require('../../src/attributes/stun-attribute');
const StunRequest = require('../../src/message/request');

const { attributeValueType, attributeType, messageType, errorReason } = constants;

test('should add FINGERPRINT', () => {
  const expectedBuffer = Buffer.from(
    '0101002c2112a442644d4f37326c71514d4f4a51' +
      '002000080001cc03e1baa56100080014a8fbde3bdc5ff7ab1e8' +
      '52a8c2cc6ef651cb74889802800042748c3bb',
    'hex',
  );

  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.setTransactionId(Buffer.from('644d4f37326c71514d4f4a51', 'hex'));

  const { XOR_MAPPED_ADDRESS, MESSAGE_INTEGRITY } = attributeType;

  message.addAttribute(XOR_MAPPED_ADDRESS, '192.168.1.35', 60689);
  message.addAttribute(
    MESSAGE_INTEGRITY,
    Buffer.from('a8fbde3bdc5ff7ab1e852a8c2cc6ef651cb74889', 'hex'),
  );

  assert.equal(message.addFingerprint(), true);
  assert.deepEqual(message.toBuffer(), expectedBuffer);
});

test('add MESSAGE-INTEGRITY', () => {
  const expectedBuffer = Buffer.from(
    '010100242112a4426f576f544a34445674305276' +
      '002000080001db91e1baa56600080014e161f72ee' +
      '71ed9f6accaef828ec42f19a809045a',
    'hex',
  );

  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.setTransactionId(Buffer.from('6f576f544a34445674305276', 'hex'));

  const { XOR_MAPPED_ADDRESS } = attributeType;
  message.addAttribute(XOR_MAPPED_ADDRESS, '192.168.1.36', 64131);

  const password = '6Gzr+PH5Krjg0VqBa81nE7n6';

  assert.equal(message.addMessageIntegrity(password), true);
  assert.deepEqual(message.toBuffer(), expectedBuffer);
});

test('FINGERPRINT should be uint32', () => {
  const { SOFTWARE } = attributeType;
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addAttribute(SOFTWARE, '123456789');

  assert.equal(message.addFingerprint(), true);
});

test('iterator', () => {
  const { BINDING_RESPONSE } = messageType;
  const { SOFTWARE, XOR_MAPPED_ADDRESS, FINGERPRINT } = attributeType;
  const message = new StunRequest();

  message.setType(BINDING_RESPONSE);

  message.addAttribute(SOFTWARE, 'node/v8.9.3');
  message.addAttribute(XOR_MAPPED_ADDRESS, '192.168.1.35', 60689);
  message.addFingerprint();

  assert.equal(message.count, 3);

  let count = 0;
  for (const attribute of message) {
    count += 1;

    assert.equal(attribute instanceof StunAttribute, true);

    switch (count) {
      case 1:
        assert.equal(attribute.type, SOFTWARE);
        break;
      case 2:
        assert.equal(attribute.type, XOR_MAPPED_ADDRESS);
        break;
      case 3:
        assert.equal(attribute.type, FINGERPRINT);
        break;
      default:
        assert.equal(count, 3);
        break;
    }
  }
});

test('add address', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addAddress('127.0.0.1', 1516);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].valueType, attributeValueType.ADDRESS);
  assert.deepEqual(attributes[0].value, {
    address: '127.0.0.1',
    port: 1516,
    family: 'IPv4',
  });
});

test('add xor address', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addXorAddress('127.0.0.1', 1516);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].valueType, attributeValueType.XOR_ADDRESS);
  assert.deepEqual(attributes[0].value, {
    address: '127.0.0.1',
    port: 1516,
    family: 'IPv4',
  });
});

test('add alternate server  ', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addAlternateServer('127.0.0.1', 1516);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.ALTERNATE_SERVER);
  assert.deepEqual(attributes[0].value, {
    address: '127.0.0.1',
    port: 1516,
    family: 'IPv4',
  });
});

test('add username', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addUsername('stun/1.2.3');

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.USERNAME);
});

test('add invalid username', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);

  assert.throws(
    () => message.addUsername('stun/1.2.3'.repeat(52)),
    /Username must be less than 513 bytes/i,
  );

  assert.equal(message.count, 0);
});

test('add username at exactly 513 bytes throws (off-by-one boundary)', () => {
  const message = new StunRequest();
  message.setType(messageType.BINDING_RESPONSE);

  // 512 bytes is the max allowed (< 513)
  assert.doesNotThrow(() => message.addUsername('x'.repeat(512)));

  const message2 = new StunRequest();
  message2.setType(messageType.BINDING_RESPONSE);
  assert.throws(
    () => message2.addUsername('x'.repeat(513)),
    /Username must be less than 513 bytes/i,
  );
});

test('add software', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addSoftware('stun/1.2.3');

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.SOFTWARE);
});

test('add realm', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addRealm('stun/1.2.3');

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.REALM);
});

test('add nonce', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  message.addNonce('stun/1.2.3');

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.NONCE);
});

test('add invalid nonce', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_RESPONSE);
  assert.throws(
    () => message.addNonce('stun/1.2.3'.repeat(13)),
    /less than 128 characters/i,
  );
  assert.equal(message.count, 0);
});

describe('removeAttribute', () => {
  test('attr not found', () => {
    const message = new StunRequest();

    const attribute = message.removeAttribute(attributeType.MAPPED_ADDRESS);
    assert.equal(attribute, undefined);
  });

  test('from start', () => {
    const message = new StunRequest();

    message.addAddress('127.0.0.1', 1234);
    message.addXorAddress('127.0.0.1', 1516);

    const removedAttribute = message.removeAttribute(attributeType.MAPPED_ADDRESS);
    assert.notEqual(removedAttribute, undefined);
    assert.equal(removedAttribute.type, attributeType.MAPPED_ADDRESS);

    const attributes = Array.from(message);
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].valueType, attributeValueType.XOR_ADDRESS);
  });

  test('from end', () => {
    const message = new StunRequest();

    message.addAddress('127.0.0.1', 1234);
    message.addXorAddress('127.0.0.1', 1516);

    const removedAttribute = message.removeAttribute(attributeType.XOR_MAPPED_ADDRESS);
    assert.notEqual(removedAttribute, undefined);
    assert.equal(removedAttribute.type, attributeType.XOR_MAPPED_ADDRESS);

    const attributes = Array.from(message);
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].valueType, attributeValueType.ADDRESS);
  });

  test('from the middle', () => {
    const message = new StunRequest();

    message.addSoftware('stun/1.2.3');
    message.addAddress('127.0.0.1', 1234);
    message.addXorAddress('127.0.0.1', 1516);

    const removedAttribute = message.removeAttribute(attributeType.MAPPED_ADDRESS);
    assert.notEqual(removedAttribute, undefined);
    assert.equal(removedAttribute.type, attributeType.MAPPED_ADDRESS);

    const attributes = Array.from(message);
    assert.equal(attributes.length, 2);
    assert.equal(attributes[0].type, attributeType.SOFTWARE);
    assert.equal(attributes[1].type, attributeType.XOR_MAPPED_ADDRESS);
  });
});

describe('add error', () => {
  test('should work', () => {
    const message = new StunRequest();

    message.setType(messageType.BINDING_ERROR_RESPONSE);
    message.addError(300, 'hello world');

    const attributes = Array.from(message);
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].type, attributeType.ERROR_CODE);
    assert.equal(attributes[0].reason, 'hello world');
    assert.equal(attributes[0].code, 300);
  });

  test('should be error type message', () => {
    const message = new StunRequest();

    message.setType(messageType.BINDING_RESPONSE);
    assert.throws(
      () => message.addError(300, 'hello world'),
      /The attribute should be in ERROR_RESPONSE messages/,
    );
  });

  test('invalid error code', () => {
    const message = new StunRequest();

    message.setType(messageType.BINDING_ERROR_RESPONSE);

    assert.throws(() => message.addError(200), /Error code should between 300 - 699/i);
    assert.throws(() => message.addError(700), /Error code should between 300 - 699/i);
  });

  test('should set default reason', () => {
    const message = new StunRequest();

    message.setType(messageType.BINDING_ERROR_RESPONSE);
    message.addError(300);

    const attributes = Array.from(message);
    assert.equal(attributes.length, 1);
    assert.equal(attributes[0].type, attributeType.ERROR_CODE);
    assert.equal(attributes[0].reason, errorReason.TRY_ALTERNATE);
    assert.equal(attributes[0].code, 300);
  });
});

test('add UNKNOWN-ATTRIBUTES', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_ERROR_RESPONSE);
  message.addUnknownAttributes([1, 2, 3]);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.UNKNOWN_ATTRIBUTES);
  assert.deepEqual(attributes[0].value, [1, 2, 3]);
});

test('add PRIORITY', () => {
  const message = new StunRequest();

  message.setType(messageType.BINDING_ERROR_RESPONSE);
  message.addPriority(123);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.PRIORITY);
  assert.equal(attributes[0].value, 123);

  assert.throws(
    () => message.addPriority(1.23),
    /The argument should be a 32-bit unsigned integer/i,
  );
  assert.throws(
    () => message.addPriority(Number.MAX_SAFE_INTEGER),
    /The argument should be a 32-bit unsigned integer/i,
  );
  // PRIORITY is uint32, not int32 — negative values must be rejected
  assert.throws(
    () => message.addPriority(-1),
    /The argument should be a 32-bit unsigned integer/i,
  );
  // uint32 boundary: 0xffffffff is valid, 0x100000000 is not
  assert.doesNotThrow(() => {
    const m = new StunRequest();
    m.setType(messageType.BINDING_ERROR_RESPONSE);
    m.addPriority(0xffffffff);
  });
});

test('add USE-CANDIDATE', () => {
  const message = new StunRequest();

  message.addUseCandidate();

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.USE_CANDIDATE);
});

test('add ICE-CONTROLLED', () => {
  const message = new StunRequest();

  const tiebreaker = Buffer.allocUnsafe(8);
  const invalidTiebreaker = Buffer.allocUnsafe(4);

  message.setType(constants.messageType.BINDING_REQUEST);
  message.addIceControlled(tiebreaker);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.ICE_CONTROLLED);
  assert.equal(attributes[0].value, tiebreaker);

  assert.throws(
    () => message.addIceControlled(123),
    /shoud be a 64-bit unsigned integer/i,
  );
  assert.throws(
    () => message.addIceControlled(invalidTiebreaker),
    /shoud be a 64-bit unsigned integer/i,
  );

  message.setType(constants.messageType.BINDING_ERROR_RESPONSE);
  assert.throws(
    () => message.addIceControlled(tiebreaker),
    /should present in a Binding request/i,
  );
});

test('add ICE-CONTROLLING', () => {
  const message = new StunRequest();

  const tiebreaker = Buffer.allocUnsafe(8);
  const invalidTiebreaker = Buffer.allocUnsafe(4);

  message.setType(constants.messageType.BINDING_REQUEST);
  message.addIceControlling(tiebreaker);

  const attributes = Array.from(message);
  assert.equal(attributes.length, 1);
  assert.equal(attributes[0].type, attributeType.ICE_CONTROLLING);
  assert.equal(attributes[0].value, tiebreaker);

  assert.throws(
    () => message.addIceControlling(123),
    /shoud be a 64-bit unsigned integer/i,
  );
  assert.throws(
    () => message.addIceControlling(invalidTiebreaker),
    /shoud be a 64-bit unsigned integer/i,
  );

  message.setType(constants.messageType.BINDING_ERROR_RESPONSE);
  assert.throws(
    () => message.addIceControlling(tiebreaker),
    /should present in a Binding request/i,
  );
});

// RFC 8489 attribute methods

test('addMessageIntegritySha256', () => {
  const key = 'test-sha256-key';
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_RESPONSE);

  assert.equal(message.addMessageIntegritySha256(key), true);
  assert.equal(message.hasAttribute(attributeType.MESSAGE_INTEGRITY_SHA256), true);
  // SHA-256 HMAC is 32 bytes.
  assert.equal(
    message.getAttribute(attributeType.MESSAGE_INTEGRITY_SHA256).value.length,
    32,
  );
});

test('addMessageIntegritySha256: returns false with no key', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_RESPONSE);
  assert.equal(message.addMessageIntegritySha256(''), false);
  assert.equal(message.addMessageIntegritySha256(null), false);
});

test('addMessageIntegritySha256: cannot coexist with MESSAGE-INTEGRITY', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_RESPONSE);
  message.addMessageIntegrity('key');
  assert.equal(message.addMessageIntegritySha256('key'), false);
});

test('addUserhash', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_REQUEST);

  const attr = message.addUserhash('user', 'example.com');
  assert.ok(attr);
  assert.equal(attr.type, attributeType.USERHASH);
  // SHA-256 produces 32 bytes.
  assert.equal(attr.value.length, 32);
});

test('addUserhash: throws on non-string args', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_REQUEST);
  assert.throws(() => message.addUserhash(42, 'realm'), TypeError);
  assert.throws(() => message.addUserhash('user', null), TypeError);
});

test('addPasswordAlgorithm', () => {
  const { passwordAlgorithm } = constants;
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_REQUEST);

  const attr = message.addPasswordAlgorithm(passwordAlgorithm.SHA_256);
  assert.ok(attr);
  assert.equal(attr.type, attributeType.PASSWORD_ALGORITHM);
  assert.equal(attr.value.algorithm, passwordAlgorithm.SHA_256);
  assert.equal(attr.value.params.length, 0);
});

test('addPasswordAlgorithms', () => {
  const { passwordAlgorithm } = constants;
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_REQUEST);

  const algorithms = [
    { algorithm: passwordAlgorithm.MD5 },
    { algorithm: passwordAlgorithm.SHA_256 },
  ];
  const attr = message.addPasswordAlgorithms(algorithms);
  assert.ok(attr);
  assert.equal(attr.type, attributeType.PASSWORD_ALGORITHMS);
  assert.equal(attr.value.length, 2);
});

test('addAlternateDomain', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_RESPONSE);

  const attr = message.addAlternateDomain('stun.example.com');
  assert.ok(attr);
  assert.equal(attr.type, attributeType.ALTERNATE_DOMAIN);
  assert.equal(attr.value.toString(), 'stun.example.com');
});

test('addAlternateDomain: throws on non-string', () => {
  const message = new StunRequest();
  message.setType(constants.messageType.BINDING_RESPONSE);
  assert.throws(() => message.addAlternateDomain(42), TypeError);
});
