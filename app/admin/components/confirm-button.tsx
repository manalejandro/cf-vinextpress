"use client";

/**
 * Submit button for destructive forms. Lives client-side only to show a
 * confirmation dialog; the form itself stays server-rendered and is
 * referenced through the HTML `form` attribute (no nested forms).
 */
export function ConfirmSubmitButton({
  formId,
  label,
  message = "Delete permanently? This cannot be undone.",
  className = "text-slate-400 hover:text-red-600",
}: {
  formId: string;
  label: string;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      form={formId}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
