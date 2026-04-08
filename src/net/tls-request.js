'use strict';

const tls = require('tls');
const decode = require('../message/decode');

module.exports = { tlsRequest };

/**
 * Send a STUN binding request over TLS-over-TCP (RFC 7064 `stuns:` scheme).
 *
 * STUN over TCP/TLS uses no additional framing — the 2-byte length field in
 * the STUN message header provides message boundaries (RFC 5389 §7.2.2).
 *
 * @param {string} hostname
 * @param {number} port
 * @param {import('../message/request')} message STUN request to send.
 * @param {object} [options]
 * @param {number} [options.timeout=5000] Socket timeout in ms.
 * @param {boolean} [options.rejectUnauthorized=true] Reject self-signed TLS certs.
 * @returns {Promise<import('../message/response')>}
 */
function tlsRequest(hostname, port, message, options = {}) {
  const timeout = options.timeout ?? 5000;
  const rejectUnauthorized = options.rejectUnauthorized ?? true;

  return new Promise((resolve, reject) => {
    const encodedMessage = message.toBuffer();

    const socket = tls.connect(
      { host: hostname, port, rejectUnauthorized, servername: hostname },
      () => {
        socket.write(encodedMessage);
      },
    );

    socket.setTimeout(timeout);
    socket.on('timeout', () => {
      socket.destroy(new Error('timeout'));
    });

    const chunks = [];
    let received = 0;

    socket.on('data', (chunk) => {
      chunks.push(chunk);
      received += chunk.length;

      // Need at least the 20-byte STUN header to read the message length.
      if (received < 20) return;

      const buf = Buffer.concat(chunks, received);
      // Bytes 2–3 of the STUN header carry the body length (excluding the header).
      const bodyLength = buf.readUInt16BE(2);
      const totalLength = 20 + bodyLength;

      if (received >= totalLength) {
        socket.destroy();
        try {
          resolve(decode(buf.subarray(0, totalLength)));
        } catch (err) {
          reject(err);
        }
      }
    });

    socket.on('error', (err) => {
      // 'error' fires before 'close' on destroy(); avoid double-reject.
      reject(err);
    });
  });
}
