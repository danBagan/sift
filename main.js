const { app, BrowserWindow, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

app.whenReady().then(() => {
    app.setAppUserModelId("com.squirrel." + app.getName());

    createWindow();
});

autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);

    const { dialog } = require('electron');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${info.version}) is available. Do you want to download and install it now?`,
        buttons: ['Yes', 'No'],
        defaultId: 0
    }).then(result => {
        if (result.response === 0) {
            autoUpdater.downloadUpdate();
        }
    });
});

autoUpdater.on('update-not-available', () => {
    console.log('No updates available.');
});

autoUpdater.on('download-progress', (progressObj) => {
    console.log(`Download speed: ${progressObj.bytesPerSecond}`);
    console.log(`Downloaded ${progressObj.percent}%`);
});

autoUpdater.on('update-downloaded', () => {
    const { dialog } = require('electron');
    dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. The app will restart to install.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0
    }).then(result => {
        if (result.response === 0) {
            autoUpdater.quitAndInstall();
        }
    });
});

autoUpdater.on('error', (err) => {
    const { dialog } = require('electron');
    dialog.showMessageBox({
        type: 'error',
        title: 'Update Error',
        message: `An error occurred while updating: ${err.message}`,
        buttons: ['OK'],
        defaultId: 0
    });
    console.error('Auto-updater error:', err);
});

if (require('electron-squirrel-startup')) {
    app.quit();
};

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
            nodeIntegration: false,
            //devTools: false
        },
        autoHideMenuBar: true
    });
    win.loadFile(path.join(__dirname, 'index.html'));
    //Menu.setApplicationMenu(null);

    win.webContents.on('did-finish-load', () => {
        win.setTitle("Sift - Task Management Application");
        autoUpdater.checkForUpdates();
    });

    win.once('ready-to-show', () => {
        win.center();
        win.show();
    });
}


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