// The flat console rail drawn in the band above the message box: it stays in
// front of the conversation while messages scroll behind it. A thin bar with
// square corners, fading out towards the right.
//
// The drawing asks for a very wide box; the app gives it the band's full width
// at most, and the viewBox stretches sideways to fill it (height stays put).

export const BAND_HEIGHT = 6

export function band(color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${BAND_HEIGHT}" viewBox="0 0 800 ${BAND_HEIGHT}" preserveAspectRatio="none">
<defs><linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
<stop offset="0" stop-color="${color}"/><stop offset="0.45" stop-color="${color}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
</linearGradient></defs>
<rect x="0" y="0" width="800" height="${BAND_HEIGHT}" fill="url(#fade)"/>
</svg>`
}
