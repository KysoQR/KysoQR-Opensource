'use client';

import '@/lib/i18n/init';
import { useEffect, useState } from 'react';
import { HomeLanding } from '@/components/HomeLanding';
import { SigningWizard } from '@/components/SigningWizard';

/**
 * `/` — matches x-sign-web's real routing: a marketing landing page
 * (HomeLanding) is what a first-time visitor sees; dropping/choosing a file
 * there hands off into the signing wizard (SigningWizard). The two are
 * separate routes in x-sign-web (`/` vs `/signing`) — collapsed into one
 * route here since there's no `documentId` to carry in a URL any more
 * (stateless, no DB), so the handoff is a plain client-side view toggle
 * instead of a navigation.
 *
 * An in-progress signing session (found in localStorage) resumes straight
 * into the wizard on load, same as reloading `/signing` used to in the old
 * app — a session that already reached a terminal status is cleared as soon
 * as it gets there (see SigningWizard), so there is nothing to resume by then.
 */
type View = 'home' | 'wizard';

const LS_SIGN_REQUEST_ID = 'kysoqr.signRequestId';
const LS_STATUS = 'kysoqr.status';
const TERMINAL_STATUSES = new Set(['SIGNED', 'REJECTED', 'FAILED', 'EXPIRED']);

export default function Page() {
  const [view, setView] = useState<View>('home');
  const [entryFile, setEntryFile] = useState<File | null>(null);

  useEffect(() => {
    const savedId = window.localStorage.getItem(LS_SIGN_REQUEST_ID);
    const savedStatus = window.localStorage.getItem(LS_STATUS);
    // Deliberate one-time resume check from localStorage (browser-only) after
    // mount — a lazy useState initializer would run during SSR too and
    // mismatch on hydration, so a mount effect is the correct pattern here.
    if (savedId && savedStatus && !TERMINAL_STATUSES.has(savedStatus)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setView('wizard');
    }
  }, []);

  if (view === 'wizard') {
    return (
      <SigningWizard
        initialFile={entryFile}
        onBackToHome={() => {
          setEntryFile(null);
          setView('home');
        }}
      />
    );
  }

  return (
    <HomeLanding
      onFileAccepted={(file) => {
        setEntryFile(file);
        setView('wizard');
      }}
    />
  );
}
