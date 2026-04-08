'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const { attributeType } = require('../../src/lib/constants')
const StunUInt16Attribute = require('../../src/attributes/stun-uint16-attribute')

const type = attributeType.RESPONSE_PORT

test('encode', () => {
  const attribute = new StunUInt16Attribute(type, 0x2345)

  const expectedBuffer = Buffer.alloc(2)
  expectedBuffer.writeUInt16BE(0x2345)

  assert.deepEqual(attribute.toBuffer(), expectedBuffer)
})

test('decode', () => {
  const expectedNumber = 0x2345
  const message = Buffer.alloc(2)
  message.writeUInt16BE(expectedNumber)

  const attribute = StunUInt16Attribute.from(type, message)

  assert.equal(attribute.value, expectedNumber)
})
