'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const constants = require('../../src/lib/constants')
const StunByteStringAttribute = require('../../src/attributes/stun-bytestring-attribute')

const type = constants.attributeType.USERNAME

test('encode', () => {
  const attribute = new StunByteStringAttribute(type, '3Qpe:b63f4e96')
  const expectedBuffer = Buffer.from('335170653a6236336634653936', 'hex')

  assert.deepEqual(attribute.toBuffer(), expectedBuffer)
})

test('decode', () => {
  const message = Buffer.from('3Qpe:b63f4e96')

  const attribute = StunByteStringAttribute.from(type, message)

  assert.deepEqual(attribute.value, message)
})
