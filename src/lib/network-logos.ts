// Local logo paths for networks that have real logos
export const NETWORK_LOGOS: Record<string, string> = {
  mtn:        '/networks/mtn.jpg',
  mtninstant: '/networks/mtn.jpg',
  mtnafa:     '/networks/mtnafa.jpg',
  telecel:    '/networks/telecel.jpg',
  at:         '/networks/at.jpg',
  airteltigo: '/networks/at.jpg',
}

// Fallback brand colors for networks without logos (streaming etc.)
export const BRAND: Record<string, { bg: string; text: string; short: string }> = {
  mtn:        { bg: '#FFCC00', text: '#1a1a1a', short: 'MTN' },
  mtninstant: { bg: '#FFCC00', text: '#1a1a1a', short: 'MTN' },
  mtnafa:     { bg: '#FFCC00', text: '#1a1a1a', short: 'AFA' },
  telecel:    { bg: '#CC0000', text: '#fff',     short: 'TEL' },
  at:         { bg: '#0033A0', text: '#fff',     short: 'AT'  },
  airteltigo: { bg: '#0033A0', text: '#fff',     short: 'AT'  },
  netflix:    { bg: '#E50914', text: '#fff',     short: 'NF'  },
  applemusic: { bg: '#FC3C44', text: '#fff',     short: 'AM'  },
  appletv:    { bg: '#000000', text: '#fff',     short: 'TV'  },
  applegames: { bg: '#0070C9', text: '#fff',     short: 'AG'  },
  icloud:     { bg: '#3693F5', text: '#fff',     short: 'iCL' },
  amazon:     { bg: '#00A8E1', text: '#fff',     short: 'AMZ' },
}
