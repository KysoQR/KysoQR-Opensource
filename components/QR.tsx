'use client';

import { useMemo } from 'react';
import qrcode from 'qrcode-generator';
import { useTranslation } from 'react-i18next';

/** Ported verbatim from x-sign-web/src/components/QR.tsx. */
type Props = {
  value: string;
  size?: number;
  level?: 'L' | 'M' | 'Q' | 'H';
  margin?: number;
  logoSrc?: string;
  logoSizeRatio?: number;
};

export default function QR({
  value,
  size = 240,
  level = 'M',
  margin = 2,
  logoSrc,
  logoSizeRatio = 0.22,
}: Props) {
  const { t } = useTranslation();
  // eslint-disable-next-line react-hooks/preserve-manual-memoization -- try/catch fallback loop isn't compiler-analyzable, memoization is still correct
  const result = useMemo(() => {
    for (const lvl of [level, 'L'] as const) {
      try {
        const qr = qrcode(0, lvl);
        qr.addData(value);
        qr.make();
        const modules = qr.getModuleCount();
        const totalModules = modules + margin * 2;
        const cellSize = Math.max(1, Math.floor(size / totalModules));
        const renderedSize = cellSize * totalModules;
        const svg = qr.createSvgTag({ cellSize, margin, scalable: false });
        return { svg, renderedSize };
      } catch {
        continue;
      }
    }
    return null;
  }, [value, size, level, margin]);

  if (!result) {
    return <div className="text-sm text-red-600">{t('scan.qrRenderFailed')}</div>;
  }

  const containerSize = result.renderedSize;
  const logoPx = Math.max(16, Math.floor(containerSize * logoSizeRatio));

  return (
    <div
      style={{ position: 'relative', width: containerSize, height: containerSize }}
      aria-label={t('scan.aria.qrCode')}
    >
      <div
        style={{ width: containerSize, height: containerSize }}
        dangerouslySetInnerHTML={{ __html: result.svg }}
      />
      {logoSrc ? (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            width: logoPx,
            height: logoPx,
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            padding: Math.max(2, Math.round(logoPx * 0.12)),
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- inline data/local logo, no optimization needed */}
          <img
            src={logoSrc}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
            aria-hidden="true"
          />
        </div>
      ) : null}
    </div>
  );
}
