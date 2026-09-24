/**
 * The platforms the certificate can be installed on, each with its own way
 * of doing it — see the application settings.
 */
export const PLATFORMS = ['android', 'ios', 'windows', 'macos', 'linux'];

/**
 * Which of them the panel is open on, or null when it cannot tell.
 *
 * *"Ta informacja ma być adekwatna do platformy, na której jesteśmy, a jak
 * się nie da określić, to switch"* (Mateusz, 2026-09-25). Null is an answer
 * the caller shows a choice for, rather than a guess: installing a
 * certificate authority the wrong way is how somebody ends up with a VPN
 * certificate nobody asked for.
 *
 * From the user agent, the only thing every browser here still sends. An
 * iPad asking for the desktop site calls itself a Mac, and its touch points
 * are what give it away.
 */
export const platformOf = ({ userAgent = '', maxTouchPoints = 0 } = {}) => {
  if (/Android/i.test(userAgent)) {
    return 'android';
  }
  if (/iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1)) {
    return 'ios';
  }
  if (/Windows/i.test(userAgent)) {
    return 'windows';
  }
  if (/Macintosh|Mac OS X/i.test(userAgent)) {
    return 'macos';
  }
  if (/Linux/i.test(userAgent) && !/CrOS/i.test(userAgent)) {
    return 'linux';
  }
  return null;
};

export default platformOf;
