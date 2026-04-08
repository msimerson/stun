'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { messageType } = require('../../src/lib/constants');

test('rfc5766 message types', () => {
  // These constants taken from webrtc source code at
  // https://chromium.googlesource.com/external/webrtc/+/master/p2p/base/stun.h

  assert.equal(messageType.ALLOCATE_REQUEST, 0x0003);
  assert.equal(messageType.ALLOCATE_RESPONSE, 0x0103);
  assert.equal(messageType.ALLOCATE_ERROR_RESPONSE, 0x0113);
  assert.equal(messageType.REFRESH_REQUEST, 0x0004);
  assert.equal(messageType.REFRESH_RESPONSE, 0x0104);
  assert.equal(messageType.REFRESH_ERROR_RESPONSE, 0x0114);
  assert.equal(messageType.SEND_INDICATION, 0x0016);
  assert.equal(messageType.DATA_INDICATION, 0x0017);
  assert.equal(messageType.CREATE_PERMISSION_REQUEST, 0x0008);
  assert.equal(messageType.CREATE_PERMISSION_RESPONSE, 0x0108);
  assert.equal(messageType.CREATE_PERMISSION_ERROR_RESPONSE, 0x0118);
  assert.equal(messageType.CHANNEL_BIND_REQUEST, 0x0009);
  assert.equal(messageType.CHANNEL_BIND_RESPONSE, 0x0109);
  assert.equal(messageType.CHANNEL_BIND_ERROR_RESPONSE, 0x0119);
});
