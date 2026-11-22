import { webAddress } from '../config/address';

// WebKit delivers navigations of embedded documents to its navigation delegate.
// Yapin's sign-in widgets create inline frames before navigating them to HTTPS.
export function allowChildFrame(url: string): boolean {
  return url === 'about:blank' || url === 'about:srcdoc' || webAddress(url) !== null;
}
