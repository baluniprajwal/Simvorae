import { useEffect } from 'react';

const SITE_NAME = 'Simvorae';

// Sets the browser tab / search result title for the current page.
export function usePageTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Modern Luxury Handbags`;
  }, [title]);
}
