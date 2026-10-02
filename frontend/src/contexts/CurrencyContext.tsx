import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';

export const CURRENCY_OPTIONS = [
  { code: 'INR', label: 'INR' },
  { code: 'USD', label: 'USD' },
  { code: 'GBP', label: 'GBP' },
  { code: 'EUR', label: 'EUR' },
  { code: 'AED', label: 'AED' },
  { code: 'CAD', label: 'CAD' },
  { code: 'AUD', label: 'AUD' },
] as const;

export type DisplayCurrency = typeof CURRENCY_OPTIONS[number]['code'];

const COUNTRY_CURRENCY: Record<string, DisplayCurrency> = {
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  DE: 'EUR',
  ES: 'EUR',
  FR: 'EUR',
  GB: 'GBP',
  IE: 'EUR',
  IN: 'INR',
  IT: 'EUR',
  NL: 'EUR',
  PT: 'EUR',
  US: 'USD',
};

const CURRENCY_STORAGE_KEY = 'simvorae_display_currency';
const RATE_CACHE_PREFIX = 'simvorae_inr_rate_';
const RATE_CACHE_DURATION = 24 * 60 * 60 * 1000;

type CurrencyContextValue = {
  currency: DisplayCurrency;
  isEstimated: boolean;
  setCurrency: (currency: DisplayCurrency) => void;
  formatPrice: (inrAmount: number) => string;
  formatInr: (inrAmount: number) => string;
};

const CurrencyContext = createContext<CurrencyContextValue | undefined>(undefined);

// Storage can be blocked (strict privacy settings); the provider wraps the whole app, so it must not throw.
const storage = {
  get(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Preference just will not be remembered.
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Nothing to clean up.
    }
  },
};

function formatAmount(amount: number, currency: DisplayCurrency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>('INR');
  const [rate, setRate] = useState(1);
  const [isRateReady, setIsRateReady] = useState(true);
  // Country detection is only a default; it must never override a currency the visitor picked.
  const hasChosenCurrencyRef = useRef(false);

  useEffect(() => {
    const savedCurrency = storage.get(CURRENCY_STORAGE_KEY) as DisplayCurrency | null;
    if (CURRENCY_OPTIONS.some((option) => option.code === savedCurrency)) {
      setCurrencyState(savedCurrency as DisplayCurrency);
      return;
    }

    fetch('/api/country')
      .then((response) => {
        if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) {
          throw new Error('Country detection unavailable.');
        }
        return response.json() as Promise<{ country?: string }>;
      })
      .then(({ country }) => {
        if (hasChosenCurrencyRef.current) return;
        const detectedCurrency = country ? COUNTRY_CURRENCY[country.toUpperCase()] : undefined;
        if (detectedCurrency) setCurrencyState(detectedCurrency);
      })
      .catch(() => {
        if (hasChosenCurrencyRef.current) return;
        setCurrencyState('INR');
      });
  }, []);

  useEffect(() => {
    if (currency === 'INR') {
      setRate(1);
      setIsRateReady(true);
      return;
    }

    const cacheKey = `${RATE_CACHE_PREFIX}${currency}`;
    const cachedRate = storage.get(cacheKey);
    if (cachedRate) {
      try {
        const parsed = JSON.parse(cachedRate) as { rate: number; fetchedAt: number };
        if (Number.isFinite(parsed.rate) && Date.now() - parsed.fetchedAt < RATE_CACHE_DURATION) {
          setRate(parsed.rate);
          setIsRateReady(true);
          return;
        }
      } catch {
        storage.remove(cacheKey);
      }
    }

    setIsRateReady(false);
    // Switching currencies quickly can let an older rate response arrive last; ignore it.
    let isCurrent = true;
    fetch(`https://api.frankfurter.dev/v2/rate/INR/${currency}`)
      .then((response) => {
        if (!response.ok) throw new Error('Exchange rate unavailable.');
        return response.json() as Promise<{ rate?: number }>;
      })
      .then((result) => {
        if (!isCurrent) return;
        if (!Number.isFinite(result.rate) || !result.rate) throw new Error('Invalid exchange rate.');
        setRate(result.rate);
        setIsRateReady(true);
        storage.set(cacheKey, JSON.stringify({
          rate: result.rate,
          fetchedAt: Date.now(),
        }));
      })
      .catch(() => {
        if (!isCurrent) return;
        // Show INR for this visit but keep the saved preference: rate outages are usually temporary,
        // and the next visit retries the visitor's chosen currency.
        setCurrencyState('INR');
        setRate(1);
        setIsRateReady(true);
      });

    return () => {
      isCurrent = false;
    };
  }, [currency]);

  const setCurrency = (nextCurrency: DisplayCurrency) => {
    hasChosenCurrencyRef.current = true;
    setCurrencyState(nextCurrency);
    storage.set(CURRENCY_STORAGE_KEY, nextCurrency);
  };

  const formatInr = (inrAmount: number) => formatAmount(inrAmount, 'INR');
  const isEstimated = currency !== 'INR' && isRateReady;
  const formatPrice = (inrAmount: number) => {
    if (!isEstimated) return formatInr(inrAmount);
    return `~${formatAmount(inrAmount * rate, currency)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, isEstimated, setCurrency, formatPrice, formatInr }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within CurrencyProvider.');
  return context;
}
