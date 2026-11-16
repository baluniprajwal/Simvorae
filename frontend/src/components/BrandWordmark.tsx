export default function BrandWordmark({ decorative = false }: { decorative?: boolean }) {
  return (
    <span aria-hidden={decorative || undefined} className={`brand-wordmark${decorative ? ' brand-wordmark--decorative' : ''}`}>
      SIMVORAE
    </span>
  );
}
