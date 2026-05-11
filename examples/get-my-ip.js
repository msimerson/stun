'use strict';

const stun = require('..');

stun
  .request('stun.l.google.com:19302')
  .then((res) => console.log('your ip:', res.getXorAddress().address))
  .catch((err) => console.error(err));
