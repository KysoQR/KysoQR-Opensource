/**
 * Compact horizontal step indicator sized to sit inline in the header row
 * (see Header.tsx's `centerContent`), replacing the old full-width
 * `StepProgress` card that used to render as its own block below the header
 * — moved here to reclaim vertical space so the signing wizard's step-1
 * screen fits one viewport without scrolling (see SigningWizard.tsx).
 */
export function HeaderSteps({
  steps,
  currentStepIndex,
}: {
  steps: readonly { key: string; label: string }[];
  currentStepIndex: number;
}) {
  return (
    <ol className="flex items-center">
      {steps.map((step, idx) => {
        const isCompleted = idx < currentStepIndex;
        const isCurrent = idx === currentStepIndex;
        return (
          <li key={step.key} className="flex items-center">
            {idx > 0 && (
              <span
                className={`mx-2.5 h-px w-8 ${idx <= currentStepIndex ? 'bg-primary' : 'bg-border-subtle'}`}
              />
            )}
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                isCompleted
                  ? 'bg-primary text-white'
                  : isCurrent
                    ? 'border-2 border-primary bg-white text-primary'
                    : 'border border-gray-300 bg-white text-text-muted'
              }`}
              {...(isCurrent ? { 'aria-current': 'step' } : {})}
            >
              {isCompleted ? '✓' : idx + 1}
            </span>
            <span
              className={`ml-2.5 whitespace-nowrap text-sm font-medium ${
                isCompleted || isCurrent ? 'text-primary-strong' : 'text-text-muted'
              }`}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
