// A flat console rail drawn in the band above the message box: it stays in
// front of the conversation while messages scroll behind it. One solid
// tangerine bar with rounded ends, as wide as the band.
const H = 12

export const BAND = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="${H}">
<rect x="0" y="0" width="100%" height="${H}" rx="${H / 2}" fill="#ff9900"/>
</svg>`

export const BAND_HEIGHT = H
