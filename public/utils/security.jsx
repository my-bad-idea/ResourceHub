// RSA helpers for password encryption
(function () {
  const cache = {
    publicKeyPem: null,
    cryptoKey: null,
    fetchedAt: 0,
  };

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function pemToArrayBuffer(pem) {
    const b64 = pem
      .replace('-----BEGIN PUBLIC KEY-----', '')
      .replace('-----END PUBLIC KEY-----', '')
      .replace(/\s+/g, '');
    const raw = atob(b64);
    const buffer = new ArrayBuffer(raw.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < raw.length; i += 1) {
      view[i] = raw.charCodeAt(i);
    }
    return buffer;
  }

  async function fetchRsaPublicKey() {
    if (cache.publicKeyPem && cache.cryptoKey) return cache.cryptoKey;

    const resp = await fetch('/api/auth/rsa-public-key');
    if (!resp.ok) throw new Error('failed_to_fetch_rsa_public_key');
    const json = await resp.json();
    const pem = json?.data?.publicKey;
    if (!pem || typeof pem !== 'string') throw new Error('invalid_rsa_public_key');

    const keyData = pemToArrayBuffer(pem);
    const cryptoKey = await window.crypto.subtle.importKey(
      'spki',
      keyData,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt'],
    );

    cache.publicKeyPem = pem;
    cache.cryptoKey = cryptoKey;
    cache.fetchedAt = nowSeconds();
    return cryptoKey;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function encryptPasswordWithTs(password) {
    if (!password) throw new Error('password_required');
    const ts = nowSeconds();
    const plain = `${password}:${ts}`;
    const key = await fetchRsaPublicKey();

    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      key,
      data,
    );

    const passwordEnc = arrayBufferToBase64(encrypted);
    return { passwordEnc, ts };
  }

  async function prepareEncryptedPasswordPayload(password) {
    return encryptPasswordWithTs(password);
  }

  window.security = {
    fetchRsaPublicKey,
    encryptPasswordWithTs,
    prepareEncryptedPasswordPayload,
  };
}());

