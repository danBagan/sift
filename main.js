if (require('electron-squirrel-startup')) {
    app.quit();
};
const { app, BrowserWindow } = require('electron');
const path = require('path');

app.setAppUserModelId("com.squirrel." + app.getName());

function createWindow() {
    const iconPath = path.join(__dirname, 'imgs/favicon/favicon_alt.ico');
    const win = new BrowserWindow({
        minWidth: 1535,
        minHeight: 860,
        title: "Sift - Task Management Application",
        icon: iconPath,
        show: false,
        center: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });
    win.loadFile(path.join(__dirname, 'index.html'));

    win.webContents.on('did-finish-load', () => {
        win.setTitle("Sift - Task Management Application");
    });

    win.once('ready-to-show', () => {
        win.center();
        win.show();
    });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});