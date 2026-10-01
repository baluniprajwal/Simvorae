import { useState } from 'react';
import { CheckCircle, Copy } from 'lucide-react';

export default function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const isIconOnly = label === '';

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <button
      type="button"
      disabled={!value}
      onClick={() => void handleCopy()}
      className={isIconOnly
        ? 'inline-flex cursor-pointer items-center text-stone-400 transition-colors hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40'
        : 'inline-flex cursor-pointer items-center gap-1.5 border border-stone-200 bg-white px-2.5 py-1.5 text-[9px] font-normal uppercase tracking-widest text-stone-500 transition-colors hover:border-[#1a1a1a] hover:text-[#1a1a1a] disabled:cursor-not-allowed disabled:opacity-40'}
    >
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      {!isIconOnly && (copied ? 'Copied' : label)}
    </button>
  );
}
