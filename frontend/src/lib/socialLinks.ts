// Add the profile URL to show a link in the footer and mobile menu. Entries left empty stay hidden.
const SOCIAL_LINKS = [
  { label: 'Instagram', url: '' },
  { label: 'Pinterest', url: '' },
  { label: 'Spotify', url: '' },
];

export const socialLinks = SOCIAL_LINKS.filter((link) => link.url.trim() !== '');
