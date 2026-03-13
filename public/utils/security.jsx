// RSA helpers for password encryption
// Uses native crypto.subtle in secure contexts (HTTPS / localhost).
// Falls back to node-forge (lazy-loaded) in plain HTTP contexts.
(function () {
  const cache = {
    publicKeyPem: null,
    cryptoKey: null,
    forgeKey: null,
    fetchedAt: 0,
  };

  const hasNativeCrypto = !!(window.crypto && window.crypto.subtle);
  let forgeLoadPromise = null;

  function nowSeconds() {
    return Math.floor(Date.now() / 1000);
  }

  function loadForge() {
    if (window.forge) return Promise.resolve();
    if (forgeLoadPromise) return forgeLoadPromise;
    forgeLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/vendor/forge.min.js';
      script.onload = () => resolve();
      script.onerror = () => {
        forgeLoadPromise = null;
        reject(new Error('failed_to_load_forge'));
      };
      document.head.appendChild(script);
    });
    return forgeLoadPromise;
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

  async function fetchPublicKeyPem() {
    if (cache.publicKeyPem) return cache.publicKeyPem;

    const resp = await fetch('/api/auth/rsa-public-key');
    if (!resp.ok) throw new Error('failed_to_fetch_rsa_public_key');
    const json = await resp.json();
    const pem = json?.data?.publicKey;
    if (!pem || typeof pem !== 'string') throw new Error('invalid_rsa_public_key');

    cache.publicKeyPem = pem;
    cache.fetchedAt = nowSeconds();
    return pem;
  }

  function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  async function encryptNative(plain) {
    const pem = await fetchPublicKeyPem();
    if (!cache.cryptoKey) {
      const keyData = pemToArrayBuffer(pem);
      cache.cryptoKey = await window.crypto.subtle.importKey(
        'spki',
        keyData,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        true,
        ['encrypt'],
      );
    }
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      cache.cryptoKey,
      new TextEncoder().encode(plain),
    );
    return arrayBufferToBase64(encrypted);
  }

  async function encryptWithForge(plain) {
    await loadForge();
    const pem = await fetchPublicKeyPem();
    if (!cache.forgeKey) {
      cache.forgeKey = window.forge.pki.publicKeyFromPem(pem);
    }
    const encrypted = cache.forgeKey.encrypt(
      window.forge.util.encodeUtf8(plain),
      'RSA-OAEP',
      { md: window.forge.md.sha256.create(), mgf1: { md: window.forge.md.sha256.create() } },
    );
    return window.forge.util.encode64(encrypted);
  }

  async function encryptPasswordWithTs(password) {
    if (!password) throw new Error('password_required');
    const ts = nowSeconds();
    const plain = `${password}:${ts}`;
    const passwordEnc = hasNativeCrypto
      ? await encryptNative(plain)
      : await encryptWithForge(plain);
    return { passwordEnc, ts };
  }

  async function fetchRsaPublicKey() {
    return fetchPublicKeyPem();
  }

  window.security = {
    fetchRsaPublicKey,
    encryptPasswordWithTs,
    prepareEncryptedPasswordPayload: encryptPasswordWithTs,
  };
}());
