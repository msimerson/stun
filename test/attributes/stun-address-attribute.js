'use strict'

const { test } = require('node:test')
const assert = require('node:assert/strict')

const StunAddressAttribute = require('../../src/attributes/stun-address-attribute')
const constants = require('../../src/lib/constants')

const type = constants.attributeType.MAPPED_ADDRESS

test('encode', () => {
  const attribute = new StunAddressAttribute(type, '192.168.1.2', 63524)

  const buf = attribute.toBuffer()
  const expectedBuffer = Buffer.from([
    0 /* Reserved */, 0x1 /* Family */, 0xf8, 0x24 /* Port */, 0xc0, 0xa8, 1, 2 /* IP */,
  ])

  assert.deepEqual(buf, expectedBuffer)
})

test('decode', () => {
  const packet = Buffer.from([
    0 /* Reserved */, 0x1 /* Family */, 0xf8, 0x24 /* Port */, 0xc0, 0xa8, 1, 2 /* IP */,
  ])

  const { value } = StunAddressAttribute.from(type, packet)

  const expectedPort = 63524
  const expectedAddress = '192.168.1.2'

  assert.equal(value.port, expectedPort)
  assert.equal(value.address, expectedAddress)
  assert.equal(value.family, 'IPv4')
})
