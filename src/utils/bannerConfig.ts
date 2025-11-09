export interface BannerData {
  id: string
  image: string
  alt: string
  link?: string
}

// Banner configuration - easily add more banners here
// To add a new banner:
// 1. Add the banner image to /public/banners/
// 2. Add a new entry to this array with unique id, image path, alt text, and optional link
export const bannerConfig: BannerData[] = [
  {
    id: 'holdstation',
    image: '/banners/holdstation.webp',
    alt: 'HoldStation Banner',
    link: 'https://worldcoin.org/mini-app?app_id=app_0d4b759921490adc1f2bd569fda9b53a&path=%2Fswap%3Ffrom%3D0x2cfc85d8e48f8eab294be644d9e25c3030863003%26to%3D0x0211f8fbfe39988a4de88a4a7ac8b2e538209e94'
  },
  {
    id: 'tpulsefi',
    image: '/banners/tpulsefi.webp',
    alt: 'TPulseFi Banner',
    link: 'https://worldcoin.org/mini-app?app_id=app_a3a55e132983350c67923dd57dc22c5e&app_mode=mini-app'
  }
]

// Banner system configuration
export const bannerSystemConfig = {
  autoRotate: true,
  rotationInterval: 8000, // 8 seconds
  showIndicators: true
}