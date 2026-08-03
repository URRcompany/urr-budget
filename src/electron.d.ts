export {}

declare global {
  interface Window {
    electronAPI?: {
      isDesktop: boolean
      platform: string
    }
  }
}
