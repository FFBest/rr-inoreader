const { app, BrowserWindow, Menu, ipcMain } = require('electron');
// disable menu
Menu.setApplicationMenu(null);

const alert = require('alert');
const path = require('path');
const Url = require('url');
const Store = require('electron-store');
const { doAuth, refreshToken } = require('./auth');

const basePath = process.cwd();

const option = {
  name: 'storeConfig',
  fileExtension: 'json',
  cwd: path.join(basePath, `${app.isPackaged ? 'build' : 'public'}`),
  clearInvalidConfig: true,
};
const store = new Store(option);

// read config appid,key ...
const appConfig = require(path.join(
  basePath,
  `${app.isPackaged ? 'build' : 'public'}/config.json`
));

let mainWindow;
const loadMain = () => {
  if (app.isPackaged) {
    mainWindow.loadURL(
      Url.format({
        pathname: path.join(basePath, 'build/index.html'),
        protocol: 'file:',
        slashes: true,
      })
    );
  } else {
    mainWindow.loadURL('http://localhost:3000/');
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

const createWindow = () => {
  if (!mainWindow) {
    mainWindow = new BrowserWindow({
      width: 1024,
      height: 768,
      minWidth: 1024,
      minHeight: 768,
      frame: true,
      icon: path.join(
        basePath,
        `${app.isPackaged ? 'build' : 'public'}/icon.png`
      ),
      webPreferences: {
        nodeIntegration: true,
        enableRemoteModule: true,
        contextIsolation: false,
      },
    });
  }
  const currentTime = new Date().getTime();
  let token = store.get('token');
  const handleNewToken = (res) => {
    const expiresTime = res.expires_in * 1000 + currentTime;
    res['expirse_time'] = expiresTime;
    store.set('token', res);
    token = res;
    loadMain();
  };
  const handleTokenError = (err) => {
    alert(JSON.stringify(err));
    store.delete('token');
    createWindow();
  };
  if (!token || token.error) {
    doAuth(appConfig, handleNewToken, handleTokenError);
    return;
  }
  if (token.expirse_time < currentTime) {
    console.log('refreshToken');
    refreshToken(appConfig, token, handleNewToken, handleTokenError);
    return;
  }
  loadMain();
};

app.on('ready', createWindow);
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

ipcMain.handle('getAppConfig', () => {
  return appConfig;
});
ipcMain.handle('getStore', () => {
  return store;
});
