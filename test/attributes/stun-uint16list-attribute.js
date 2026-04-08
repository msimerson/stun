'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const StunUInt16ListAttribute = require('../../src/attributes/stun-uint16list-attribute')
const constants = require('../../src/lib/constants')

const type = constants.attributeType.UNKNOWN_ATTRIBUTES

test('encode', () => {
  const attribute = new StunUInt16ListAttribute(type)

  attribute.addType(1)
  attribute.addType(2)
  attribute.addType(3)

  const expectedBuffer = Buffer.from([0, 0x1, 0, 0x2, 0, 0x3])

  assert.deepEqual(attribute.toBuffer(), expectedBuffer)
})

test('decode', () => {
  const packet = Buffer.from([0, 0x1, 0, 0x2, 0, 0x3])

  const attribute = StunUInt16ListAttribute.from(type, packet)

  assert.deepEqual(attribute.value, [1, 2, 3])
})

test('encode # constructor', () => {
  const attribute = new StunUInt16ListAttribute(type, [1, 2, 3])

  const expectedBuffer = Buffer.from([0, 0x1, 0, 0x2, 0, 0x3])

  assert.deepEqual(attribute.toBuffer(), expectedBuffer)
})
