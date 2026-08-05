const { app, BrowserWindow } = require('electron')
const path = require('path')

const isDev = !app.isPackaged
const DEV_ORIGIN = 'http://localhost:5173'

function isAllowedNavigation(url) {
  if (url.startsWith(DEV_ORIGIN)) return true
  if (url.startsWith('file://')) return true
  return false
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'URRcompany · ReelBudget',
    backgroundColor: '#eef1f4',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      nativeWindowOpen: true,
    },
  })

  // OAuth 팝업: Google 로그인 창만 허용
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://accounts.google.com/')) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 480,
          height: 640,
          autoHideMenuBar: true,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: false,
          },
        },
      }
    }
    return { action: 'deny' }
  })

  // 메인 창이 Google 등 외부 URL로 이동하면 하얀 화면이 될 수 있음 → 차단
  win.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
    }
  })

  win.webContents.on('will-redirect', (event, url) => {
    if (!isAllowedNavigation(url)) {
      event.preventDefault()
    }
  })

  if (isDev) {
    win.loadURL(DEV_ORIGIN)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
