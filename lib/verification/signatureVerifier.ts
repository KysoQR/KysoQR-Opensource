import { createHash } from 'node:crypto';
import forge from 'node-forge';
import { parseCertificateInfo } from './certParser';
import { parseCmsMessage } from './cmsAsn1';
import { verifyDebug } from './debugLog';
import { fixForgeString } from './fixForgeString';

export type SignatureVerificationFailureReason =
  | 'MISSING_SIGNER_INFO'
  | 'MISSING_SIGNATURE'
  | 'LEAF_CERTIFICATE_NOT_FOUND'
  | 'WEAK_OR_UNSUPPORTED_DIGEST_ALGORITHM'
  | 'SIGNATURE_VERIFICATION_FAILED'
  | 'SIGNATURE_VERIFICATION_ERROR';

export type SignatureVerificationResult =
  | { ok: true; leafCertificate: forge.pki.Certificate }
  | {
      ok: false;
      reason: SignatureVerificationFailureReason;
      leafCertificate?: forge.pki.Certificate;
    };

/**
 * Digest algorithms strong enough to trust a document signature by. This is
 * the actual security fix this module exists for: the legacy verifier never
 * checked `SignerInfo.signature` at all, only compared the self-declared
 * `messageDigest` attribute. A real cryptographic check makes a weak hash
 * exploitable again (collision-based forgery), so SHA-1/MD5/MD2 are rejected
 * here even though they're otherwise valid RSASSA-PKCS1-v1.5 digest OIDs.
 *
 * Scope: this only restricts the hash algorithm the *document signer* used
 * for their own `SignerInfo.signature` (this function's subject). It does
 * NOT apply to Root CA trust-anchor certs (trusted via full DER-byte
 * comparison in `BundledRootStore`, never by re-verifying the root's own
 * self-signature -- see `lib/trustStore/roots/README.md`) nor to
 * intermediate/leaf-issuance links inside the chain (`certChainVerifier.ts`,
 * ported as-is from the legacy verifier, unrestricted by design).
 */
const MIN_TRUSTED_DIGEST_ALGORITHMS: Record<string, string> = {
  '2.16.840.1.101.3.4.2.1': 'sha256',
  '2.16.840.1.101.3.4.2.2': 'sha384',
  '2.16.840.1.101.3.4.2.3': 'sha512',
};

/**
 * Additionally accepted, but ONLY for the legacy "no signedAttrs" CMS variant
 * (see the branch in `verifySignerInfoSignature` below) -- SHA-1 is still in
 * real, current production use for exactly this variant by at least one
 * licensed Vietnamese CA (FastCA), and NEAC's own official verifier
 * (neac.gov.vn) accepts it as valid. Confirmed 2026-09-23 against a real,
 * NEAC-valid production signature: FastCA-issued cert, SHA-1 digest, no
 * signedAttrs -- this app previously rejected it outright as
 * "cryptographically invalid", which was simply wrong (see git history for
 * the investigation).
 *
 * Deliberately NOT added to `MIN_TRUSTED_DIGEST_ALGORITHMS` (the modern
 * signedAttrs path): that path is a fresh, first-class RFC 5652 structure
 * this app can reasonably hold to a stricter modern bar. This table exists
 * only so real, already-deployed legacy signatures aren't flagged invalid.
 */
const LEGACY_NO_SIGNED_ATTRS_DIGEST_ALGORITHMS: Record<string, string> = {
  ...MIN_TRUSTED_DIGEST_ALGORITHMS,
  '1.3.14.3.2.26': 'sha1',
};

type Asn1Node = forge.asn1.Asn1;

function isContextSpecific(node: Asn1Node | undefined, type: number): boolean {
  return !!node && node.tagClass === forge.asn1.Class.CONTEXT_SPECIFIC && node.type === type;
}

function isUniversal(node: Asn1Node | undefined, type: number): boolean {
  return !!node && node.tagClass === forge.asn1.Class.UNIVERSAL && node.type === type;
}

/**
 * Walk one SignerInfo's children in the fixed order the CMS SignerInfo ASN.1
 * type defines (RFC 2315 §9.2 / RFC 5652 §5.3):
 *
 *   version (INTEGER), issuerAndSerialNumber (SEQUENCE), digestAlgorithm
 *   (SEQUENCE), [authenticatedAttributes] ([0] IMPLICIT, optional),
 *   digestEncryptionAlgorithm (SEQUENCE), signature (OCTET STRING),
 *   [unauthenticatedAttributes] ([1] IMPLICIT, optional)
 *
 * Only the two attribute fields are optional, so version/issuerAndSerial/
 * digestAlgorithm are always at fixed indices; everything after that is
 * found by tag rather than position.
 */
function parseSignerInfoFields(signerInfo: Asn1Node): {
  version: Asn1Node | undefined;
  issuerAndSerialNumber: Asn1Node | undefined;
  digestAlgorithm: Asn1Node | undefined;
  authenticatedAttributes: Asn1Node | undefined;
  digestEncryptionAlgorithm: Asn1Node | undefined;
  signature: Asn1Node | undefined;
} {
  const children = Array.isArray(signerInfo.value) ? (signerInfo.value as Asn1Node[]) : [];

  const version = children[0];
  const issuerAndSerialNumber = children[1];
  const digestAlgorithm = children[2];

  let cursor = 3;
  let authenticatedAttributes: Asn1Node | undefined;
  if (isContextSpecific(children[cursor], 0)) {
    authenticatedAttributes = children[cursor];
    cursor += 1;
  }

  // digestEncryptionAlgorithm's OID isn't needed for verification itself --
  // forge's RSASSA-PKCS1-v1.5 verify reads the real digest algorithm back out
  // of the decrypted DigestInfo itself -- but the node is still returned so
  // the debug dump below can show it.
  const digestEncryptionAlgorithm = children[cursor];
  cursor += 1;

  const signature = isUniversal(children[cursor], forge.asn1.Type.OCTETSTRING)
    ? children[cursor]
    : undefined;

  return {
    version,
    issuerAndSerialNumber,
    digestAlgorithm,
    authenticatedAttributes,
    digestEncryptionAlgorithm,
    signature,
  };
}

/** OID -> human-readable name, for whatever forge already knows (falls back
 * to the raw OID string). */
function oidName(oid: string): string {
  return forge.pki.oids[oid] || oid;
}

function algorithmIdentifierForLog(node: Asn1Node | undefined): { oid: string; name: string } | null {
  const oidNode = Array.isArray(node?.value) ? (node.value[0] as Asn1Node) : undefined;
  if (!oidNode || typeof oidNode.value !== 'string') return null;
  const oid = forge.asn1.derToOid(oidNode.value);
  return { oid, name: oidName(oid) };
}

/** Decode one `Attribute` from `authenticatedAttributes` into a printable
 * {oid, name, value} for debug logging -- generic over whichever attributes
 * a given signer included (contentType, messageDigest, signingTime, and any
 * signer-specific extras), not just the ones this module actually reads. */
function decodeAttributeForLog(attr: Asn1Node): { oid: string; name: string; value: string } {
  const children = Array.isArray(attr.value) ? (attr.value as Asn1Node[]) : [];
  const oidNode = children[0];
  const oid =
    oidNode && typeof oidNode.value === 'string' ? forge.asn1.derToOid(oidNode.value) : 'unknown';
  const name = oidName(oid);

  const valueSet = children[1];
  const inner = Array.isArray(valueSet?.value) ? (valueSet.value[0] as Asn1Node | undefined) : undefined;

  let value = '(unparseable)';
  if (inner && typeof inner.value === 'string') {
    if (name === 'messageDigest') {
      value = forge.util.createBuffer(inner.value).toHex();
    } else if (
      isUniversal(inner, forge.asn1.Type.UTCTIME) ||
      isUniversal(inner, forge.asn1.Type.GENERALIZEDTIME)
    ) {
      value = inner.value; // raw ASN.1 time string, e.g. YYMMDDHHMMSSZ
    } else if (isUniversal(inner, forge.asn1.Type.OID)) {
      value = forge.asn1.derToOid(inner.value);
    } else {
      value = fixForgeString(inner.value);
    }
  }

  return { oid, name, value };
}

function findLeafCertificate(
  certs: forge.pki.Certificate[],
  issuerAndSerialNumber: Asn1Node | undefined
): forge.pki.Certificate | undefined {
  const children = Array.isArray(issuerAndSerialNumber?.value)
    ? (issuerAndSerialNumber.value as Asn1Node[])
    : [];
  const serialNode = children[1];
  if (!serialNode || typeof serialNode.value !== 'string') return undefined;

  const serialHex = forge.util.createBuffer(serialNode.value).toHex().toLowerCase();
  // Serial-number match only, no issuer DN cross-check: picking the wrong
  // cert here just self-corrects to a safe rejection below (the RSA verify
  // fails against the wrong public key), it is not itself a trust decision.
  return certs.find((c) => (c.serialNumber || '').toLowerCase() === serialHex);
}

/**
 * Re-tag the `[0]` IMPLICIT authenticatedAttributes as an explicit
 * `SET OF Attribute` and re-encode as DER -- per CMS (RFC 5652 §5.4), the
 * "message" that was actually hashed and signed is the DER encoding of the
 * SignedAttrs value as a SET, not as it's embedded (IMPLICIT-tagged) inside
 * SignerInfo. The child elements (and their own original byte content) are
 * reused as-is, so this only changes the outer tag, never the attribute
 * order or content.
 */
function derEncodeAsSet(attributesNode: Asn1Node): string {
  const set = forge.asn1.create(
    forge.asn1.Class.UNIVERSAL,
    forge.asn1.Type.SET,
    true,
    attributesNode.value ?? []
  );
  return forge.asn1.toDer(set).getBytes();
}

/**
 * Cryptographically verify `SignerInfo.signature`: the actual proof that the
 * claimed signer's private key produced this signature.
 *
 * This is the fix for the vulnerability motivating this whole rewrite -- the
 * legacy verifier only ever compared the self-declared `messageDigest`
 * attribute against the PDF content and never checked this signature at all,
 * so a forged CMS with a correct `messageDigest` but a garbage/copied
 * `signature` field was accepted as valid.
 *
 * Per RFC 5652 §5.4, what actually got RSA-signed depends on whether
 * `authenticatedAttributes` (signedAttrs) is present at all -- it's an
 * OPTIONAL field, and its absence is a real, valid, still-in-production CMS
 * variant (confirmed against a real NEAC-valid signature, see the digest
 * algorithm table above), not a malformed message:
 *   - Present (the common case, e.g. CAS/CMC-CA-issued signatures): the
 *     signature covers the digest of the DER-encoded SignedAttrs SET.
 *   - Absent (e.g. FastCA-issued signatures seen in production): there is no
 *     SignedAttrs to hash, and no separate `messageDigest` attribute either
 *     -- the signature covers the digest of the signed content bytes
 *     directly (the PDF's ByteRange-covered bytes, same bytes
 *     `verifyPdfContentDigest` would otherwise hash). Content integrity for
 *     this variant is therefore established by THIS check, not a separate
 *     one -- see `pdfContentDigestVerifier.ts`'s early-return for this case.
 *
 * `pdfBytes`/`byteRange` are only actually used in the second branch; they're
 * required (not optional) because production callers always have them
 * available and it's easy to forget to pass them if made optional.
 */
export function verifySignerInfoSignature(
  cmsDer: Buffer,
  pdfBytes: Buffer,
  byteRange: [number, number, number, number]
): SignatureVerificationResult {
  try {
    const p7 = parseCmsMessage(cmsDer);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawCapture = (p7 as any)?.rawCapture;
    const signerInfos = rawCapture?.signerInfos;
    if (!Array.isArray(signerInfos) || signerInfos.length === 0) {
      return { ok: false, reason: 'MISSING_SIGNER_INFO' };
    }

    const signerInfo = signerInfos[0] as Asn1Node;
    const {
      version,
      issuerAndSerialNumber,
      digestAlgorithm,
      authenticatedAttributes,
      digestEncryptionAlgorithm,
      signature,
    } = parseSignerInfoFields(signerInfo);

    const hasSignedAttrs = !!authenticatedAttributes;

    verifyDebug('signature:cms-full-dump', {
      signerInfoVersion:
        version && typeof version.value === 'string'
          ? forge.util.createBuffer(version.value).toHex()
          : null,
      digestAlgorithm: algorithmIdentifierForLog(digestAlgorithm),
      digestEncryptionAlgorithm: algorithmIdentifierForLog(digestEncryptionAlgorithm),
      authenticatedAttributes:
        authenticatedAttributes && Array.isArray(authenticatedAttributes.value)
          ? (authenticatedAttributes.value as Asn1Node[]).map(decodeAttributeForLog)
          : null,
      signatureLengthBytes: typeof signature?.value === 'string' ? signature.value.length : null,
    });

    if (!signature || typeof signature.value !== 'string') {
      return { ok: false, reason: 'MISSING_SIGNATURE' };
    }

    const digestAlgorithmOidNode = Array.isArray(digestAlgorithm?.value)
      ? digestAlgorithm.value[0]
      : undefined;
    const digestAlgorithmOid =
      digestAlgorithmOidNode && typeof digestAlgorithmOidNode.value === 'string'
        ? forge.asn1.derToOid(digestAlgorithmOidNode.value)
        : undefined;
    const allowedDigestAlgorithms = hasSignedAttrs
      ? MIN_TRUSTED_DIGEST_ALGORITHMS
      : LEGACY_NO_SIGNED_ATTRS_DIGEST_ALGORITHMS;
    const digestAlgorithmName = digestAlgorithmOid
      ? allowedDigestAlgorithms[digestAlgorithmOid]
      : undefined;
    verifyDebug('signature:digest-algorithm', {
      oidFound: digestAlgorithmOid,
      accepted: digestAlgorithmName ?? null,
      hasSignedAttrs,
      rule: hasSignedAttrs
        ? 'signedAttrs present -- must resolve to sha256/sha384/sha512 -- anything else (incl. sha1/md5) is rejected here'
        : 'no signedAttrs (legacy variant) -- sha256/sha384/sha512 or sha1 accepted (see LEGACY_NO_SIGNED_ATTRS_DIGEST_ALGORITHMS)',
    });
    if (!digestAlgorithmName) {
      return { ok: false, reason: 'WEAK_OR_UNSUPPORTED_DIGEST_ALGORITHM' };
    }

    const certs = (p7 as unknown as { certificates?: forge.pki.Certificate[] }).certificates ?? [];
    const children = Array.isArray(issuerAndSerialNumber?.value)
      ? (issuerAndSerialNumber.value as Asn1Node[])
      : [];
    const serialNode = children[1];
    const wantedSerialHex =
      serialNode && typeof serialNode.value === 'string'
        ? forge.util.createBuffer(serialNode.value).toHex().toLowerCase()
        : undefined;
    const leafCert = findLeafCertificate(certs, issuerAndSerialNumber);
    verifyDebug('signature:leaf-certificate-lookup', {
      serialNumberFromSignerInfo: wantedSerialHex,
      certsAvailableInCms: certs.map((c) => {
        const info = parseCertificateInfo(c);
        return {
          subject: info.subjectFull,
          issuer: info.issuerFull,
          serialNumber: c.serialNumber,
          validFrom: info.validFrom.toISOString(),
          validTo: info.validTo.toISOString(),
        };
      }),
      matchedLeaf: leafCert
        ? {
            subject: parseCertificateInfo(leafCert).subjectFull,
            serialNumber: leafCert.serialNumber,
          }
        : null,
    });
    if (!leafCert) {
      return { ok: false, reason: 'LEAF_CERTIFICATE_NOT_FOUND' };
    }

    let digest: Buffer;
    if (hasSignedAttrs) {
      const signedAttrsDer = derEncodeAsSet(authenticatedAttributes!);
      digest = createHash(digestAlgorithmName)
        .update(Buffer.from(signedAttrsDer, 'binary'))
        .digest();
      verifyDebug('signature:digest-to-verify', {
        mode: 'signedAttrs',
        signedAttributesDerBytes: signedAttrsDer.length,
        computedDigestHex: digest.toString('hex'),
        rawSignatureBytes: signature.value.length,
        willCompareAgainst:
          "the DigestInfo forge decrypts out of `signature` using the leaf's public key",
      });
    } else {
      const [a, b, c, d] = byteRange;
      digest = createHash(digestAlgorithmName)
        .update(pdfBytes.subarray(a, a + b))
        .update(pdfBytes.subarray(c, c + d))
        .digest();
      verifyDebug('signature:digest-to-verify', {
        mode: 'directContentDigest (no signedAttrs)',
        byteRangeHashed: byteRange,
        computedDigestHex: digest.toString('hex'),
        rawSignatureBytes: signature.value.length,
        willCompareAgainst:
          "the DigestInfo forge decrypts out of `signature` using the leaf's public key",
      });
    }

    // node-forge (and this whole pipeline) only ever parses RSA certificates
    // -- `certificateFromAsn1` throws for any other key algorithm before we
    // get this far, so this cast reflects a guarantee already enforced
    // upstream, not an unchecked assumption.
    const publicKey = leafCert.publicKey as forge.pki.rsa.PublicKey;
    const verified = publicKey.verify(digest.toString('binary'), signature.value);
    verifyDebug('signature:rsa-verify-result', { verified, hasSignedAttrs });
    if (!verified) {
      return { ok: false, reason: 'SIGNATURE_VERIFICATION_FAILED', leafCertificate: leafCert };
    }

    return { ok: true, leafCertificate: leafCert };
  } catch (error) {
    verifyDebug('signature:exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: false, reason: 'SIGNATURE_VERIFICATION_ERROR' };
  }
}
