'use strict';

const StunRequest = require('./message/request');
const StunResponse = require('./message/response');
const StunServer = require('./net/dgram-server');
const defaultConstants = require('./lib/constants');
const {
  validateFingerprint,
  validateMessageIntegrity,
  validateMessageIntegritySha256,
} = require('./lib/validate');
const { StunError, StunMessageError, StunResponseError } = require('./lib/errors');
const { request } = require('./net/request');
const { createServer } = require('./net/create-server');
const { createMessage, createTransaction } = require('./lib/create-message');
const encode = require('./message/encode');
const decode = require('./message/decode');

const constants = {};

module.exports = {
  createMessage,
  createServer,
  createTransaction,
  request,
  validateFingerprint,
  validateMessageIntegrity,
  validateMessageIntegritySha256,
  encode,
  decode,
  StunRequest,
  StunResponse,
  StunServer,
  StunError,
  StunMessageError,
  StunResponseError,
  constants,
};

// Build the public constants object from the internal constant groups.
const prefix = (obj, pre) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [`${pre}${k}`, v]));

Object.assign(
  constants,
  prefix(defaultConstants.messageType, 'STUN_'),
  prefix(defaultConstants.errorCode, 'STUN_CODE_'),
  prefix(defaultConstants.errorReason, 'STUN_REASON_'),
  prefix(defaultConstants.attributeType, 'STUN_ATTR_'),
  prefix(defaultConstants.eventNames, 'STUN_'),
  prefix(defaultConstants.passwordAlgorithm, 'STUN_PASSWORD_ALGORITHM_'),
);
