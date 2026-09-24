import type { TrustStore } from '../trustStore/TrustStore';
import { parseCertificateInfo } from './certParser';
import { parseCmsMessage } from './cmsAsn1';
import { type ChainCertInfo, verifyCertificateChainFromCmsBuffer } from './certChainVerifier';
import { verifyDebug } from './debugLog';
import { verifyPdfContentDigest } from './pdfContentDigestVerifier';
import {
  type ExtractCmsSuccess,
  extractAllCmsFromSignedPdf,
  isLastSignatureCoveringWholeFile,
} from './pdfSignatureExtractor';
import { verifySignerInfoSignature } from './signatureVerifier';
import { extractSigningTimeFromCms } from './signingTimeExtraction';

export type VerificationStatus =
  | 'SIGNED_VALID'
  | 'CONTENT_DIGEST_MISMATCH'
  | 'CHAIN_VALIDATION_FAILED'
  | 'ROOT_NOT_TRUSTED'
  | 'SIGNATURE_INVALID'
  | 'TRUST_STORE_NOT_CONFIGURED'
  | 'UNSUPPORTED_SUBFILTER';

export interface VerificationCertificate {
  subject: string;
  issuer: string;
  serialNumber: string;
  validFrom: string;
  validTo: string;
}

/** Verification outcome for one CMS signature/revision inside a PDF. */
export interface VerificationResult {
  status: VerificationStatus;
  message: string;
  signedAt?: string | undefined;
  certificate?: VerificationCertificate | undefined;
  certificateChain?: ChainCertInfo[] | undefined;
  certificateChainRootNotInTrustStore?: boolean | undefined;
  /** Informational only -- does not affect `status`. A signature stays
   * SIGNED_VALID forever once its certificate was valid AT SIGNING TIME;
   * this just tells the UI the certificate has since expired as of "now". */
  certificateExpiredNow?: boolean | undefined;
  contentIntact?: boolean | undefined;
}

function toVerificationCertificate(
  cert: import('node-forge').pki.Certificate
): VerificationCertificate {
  const parsed = parseCertificateInfo(cert);
  return {
    subject: parsed.subjectFull,
    issuer: parsed.issuerFull,
    serialNumber: parsed.serialNumber,
    validFrom: parsed.validFrom.toISOString(),
    validTo: parsed.validTo.toISOString(),
  };
}

async function verifyOneSignature(
  pdfBytes: Buffer,
  extracted: ExtractCmsSuccess,
  trustStore: TrustStore,
  wholeFileCovered: boolean
): Promise<VerificationResult> {
  const { cmsDer, byteRange, dictSigningTime } = extracted;

  const sigCheck = verifySignerInfoSignature(cmsDer, pdfBytes, byteRange);
  const certificate = sigCheck.leafCertificate
    ? toVerificationCertificate(sigCheck.leafCertificate)
    : undefined;

  let signedAt = dictSigningTime;
  try {
    signedAt = extractSigningTimeFromCms(parseCmsMessage(cmsDer)) ?? dictSigningTime;
  } catch {
    // keep dictSigningTime fallback
  }

  if (!sigCheck.ok) {
    verifyDebug('orchestrator:result', { status: 'SIGNATURE_INVALID', reason: sigCheck.reason });
    return {
      status: 'SIGNATURE_INVALID',
      message:
        'The signature could not be cryptographically verified against the signer’s certificate.',
      signedAt,
      certificate,
    };
  }

  // Content-integrity check: the CMS messageDigest must match a fresh hash
  // of the actual signed byte ranges. `wholeFileCovered` is the PDF Shadow
  // Attack guard (only meaningful for the newest signature) -- unaccounted
  // trailing bytes after the last signed revision are treated the same as a
  // digest mismatch, since a viewer could render them as if they were part
  // of the signed content.
  const digestCheck = verifyPdfContentDigest(pdfBytes, cmsDer, byteRange);
  verifyDebug('orchestrator:content-check', { digestCheckOk: digestCheck.ok, wholeFileCovered });
  if (!digestCheck.ok || !wholeFileCovered) {
    verifyDebug('orchestrator:result', {
      status: 'CONTENT_DIGEST_MISMATCH',
      cause: !digestCheck.ok
        ? digestCheck.reason
        : 'shadow-attack: last signature does not cover whole file',
    });
    return {
      status: 'CONTENT_DIGEST_MISMATCH',
      message: 'The PDF content does not match what was actually signed.',
      signedAt,
      certificate,
      contentIntact: false,
    };
  }

  if (!trustStore.isConfigured()) {
    verifyDebug('orchestrator:result', { status: 'TRUST_STORE_NOT_CONFIGURED' });
    return {
      status: 'TRUST_STORE_NOT_CONFIGURED',
      message:
        'The server trust store is not configured; the certificate chain could not be anchored.',
      signedAt,
      certificate,
      contentIntact: true,
    };
  }

  const signedAtDate = signedAt ? new Date(signedAt) : undefined;
  const validityCheckDate =
    signedAtDate && !Number.isNaN(signedAtDate.getTime()) ? signedAtDate : undefined;
  const chainResult = await verifyCertificateChainFromCmsBuffer(
    cmsDer,
    trustStore,
    validityCheckDate
  );

  if (!chainResult) {
    verifyDebug('orchestrator:result', {
      status: 'CHAIN_VALIDATION_FAILED',
      cause: 'no certificates in CMS',
    });
    return {
      status: 'CHAIN_VALIDATION_FAILED',
      message: 'The PDF signature contains no valid certificate chain.',
      signedAt,
      certificate,
      contentIntact: true,
    };
  }

  if (!chainResult.valid) {
    if (chainResult.rootNotInTrustStore) {
      // The vulnerability this replaces: the legacy verifier treated this
      // exact case as still SIGNED_VALID. An untrusted root is now always
      // its own distinct, non-valid status.
      verifyDebug('orchestrator:result', { status: 'ROOT_NOT_TRUSTED' });
      return {
        status: 'ROOT_NOT_TRUSTED',
        message:
          'The signature and content are cryptographically valid, but the root CA is not in the trust store.',
        signedAt,
        certificate,
        certificateChain: chainResult.chain,
        certificateChainRootNotInTrustStore: true,
        certificateExpiredNow: chainResult.certificateExpiredNow,
        contentIntact: true,
      };
    }

    verifyDebug('orchestrator:result', {
      status: 'CHAIN_VALIDATION_FAILED',
      cause: chainResult.error,
    });
    return {
      status: 'CHAIN_VALIDATION_FAILED',
      message: chainResult.error ?? 'The signature certificate chain is invalid.',
      signedAt,
      certificate,
      certificateChain: chainResult.chain,
      contentIntact: true,
    };
  }

  verifyDebug('orchestrator:result', {
    status: 'SIGNED_VALID',
    certificateExpiredNow: chainResult.certificateExpiredNow,
  });
  return {
    status: 'SIGNED_VALID',
    message: chainResult.certificateExpiredNow
      ? 'The signature was valid at signing time; the certificate has since expired.'
      : 'The signature, content, and certificate chain are all valid.',
    signedAt,
    certificate,
    certificateChain: chainResult.chain,
    certificateExpiredNow: chainResult.certificateExpiredNow,
    contentIntact: true,
  };
}

/**
 * Upper bound on how many embedded signatures a single upload will actually
 * verify. Each signature can fan out into several outbound network calls
 * (AIA intermediate-CA fetch + OCSP + CRL, each independently SSRF-guarded
 * but still real requests) via `verifyCertificateChainFromCmsBuffer` --
 * without a cap, a PDF hand-crafted with dozens of fabricated
 * `/ByteRange`+`/SubFilter`+`/Contents` signature-dictionary-shaped blocks
 * (trivial: extraction is plain byte-scanning, not real PDF object parsing)
 * could fan out into a large multiple of that in outbound calls per request,
 * amplifying both cost and the surface of any one guarded-fetch edge case.
 * A real document with more than a handful of independent signatures is
 * already unusual -- excess entries beyond this cap are simply not verified.
 */
const MAX_SIGNATURES_PER_DOCUMENT = 10;

/**
 * Verify every CMS signature embedded in a PDF, independent of any DB/CAS
 * lookup -- the real cryptographic verification entry point.
 *
 * Each signature is verified independently: an unexpected error while
 * processing one (e.g. a malformed embedded certificate) produces a
 * SIGNATURE_INVALID entry for that signature rather than failing the whole
 * request. An unsigned PDF returns an empty array (not an error).
 */
export async function verifyPdfSignatures(
  pdfBytes: Buffer,
  trustStore: TrustStore
): Promise<VerificationResult[]> {
  verifyDebug('orchestrator:start', { pdfBytes: pdfBytes.length });

  const extraction = extractAllCmsFromSignedPdf(pdfBytes);
  if (!extraction.ok) {
    verifyDebug('orchestrator:extraction-failed', { error: extraction.error });
    if (extraction.error.kind === 'NO_SIGNATURE_FIELD_FOUND') return [];
    if (extraction.error.kind === 'UNSUPPORTED_SUBFILTER') {
      return [
        {
          status: 'UNSUPPORTED_SUBFILTER',
          message: `The PDF uses an unsupported digital signature format (${extraction.error.subFilter ?? 'unknown'}).`,
        },
      ];
    }
    return [
      {
        status: 'SIGNATURE_INVALID',
        message: 'The PDF signature structure is malformed and could not be parsed.',
      },
    ];
  }

  if (extraction.values.length > MAX_SIGNATURES_PER_DOCUMENT) {
    verifyDebug('orchestrator:too-many-signatures', {
      found: extraction.values.length,
      cap: MAX_SIGNATURES_PER_DOCUMENT,
    });
  }
  const values = extraction.values.slice(0, MAX_SIGNATURES_PER_DOCUMENT);

  const wholeFileCovered = isLastSignatureCoveringWholeFile(values, pdfBytes.length);
  const lastIndex = values.length - 1;
  const last = values[lastIndex];
  verifyDebug('orchestrator:shadow-attack-check', {
    totalFileLength: pdfBytes.length,
    lastSignatureByteRange: last?.byteRange,
    lastSignatureCoveredUpTo: last ? last.byteRange[2] + last.byteRange[3] : null,
    wholeFileCovered,
  });

  return Promise.all(
    values.map((value, index) =>
      verifyOneSignature(
        pdfBytes,
        value,
        trustStore,
        index === lastIndex ? wholeFileCovered : true
      ).catch((): VerificationResult => ({
        status: 'SIGNATURE_INVALID',
        message: 'An unexpected error occurred while verifying this signature.',
      }))
    )
  );
}
