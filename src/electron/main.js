const { app, BrowserWindow, Menu } = require('electron');
// disable menu
Menu.setApplicationMenu(null);
const alert = require('alert');
const path = require('path');
const Url = require('url');
const Store = require('electron-store');
const { doAuth } = require('./auth');

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
      frame: true,
      icon: path.join(
        basePath,
        `${app.isPackaged ? 'build' : 'public'}/icon.png`
      ),
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
  if (!token) {
    doAuth(appConfig, handleNewToken, (err) => {
      alert(err);
    });
  } else if (token.expirse_time < currentTime - 3600000) {
    refreshToken(appConfig, token, handleNewToken, (err) => {
      alert(err);
      store.delete('token');
      createWindow();
    });
  } else {
    loadMain();
  }
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
