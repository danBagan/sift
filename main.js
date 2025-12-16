const { app, BrowserWindow, Menu, shell, dialog, ipcMain } = require('electron');
const https = require('https');
const path = require('path');


function checkForUpdates() {

    const currentVersion = app.getVersion(); // Gets version from package.json
    const options = {
        hostname: 'api.github.com',
        path: '/repos/danBagan/sift/releases/latest',
        headers: {
            'User-Agent': 'Sift-App'
        }
    };

    https.get(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
            data += chunk;
        });

        res.on('end', () => {
            try {
                const release = JSON.parse(data);
                const latestVersion = release.tag_name.replace('v', '');

                console.log(`Current: ${currentVersion}, Latest: ${latestVersion}`);

                if (latestVersion > currentVersion) {
                    dialog.showMessageBox({
                        type: 'info',
                        title: 'Update Available',
                        message: `Version ${latestVersion} is available!`,
                        detail: `You're running version ${currentVersion}.\n\nClick OK to download.`,
                        buttons: ['Download', 'Later'],
                        defaultId: 0
                    }).then(result => {
                        if (result.response === 0) {
                            shell.openExternal(release.html_url);
                        }
                    });
                }
            } catch (err) {
                console.error('Error checking for updates:', err);
            }
        });
    }).on('error', (err) => {
        console.error('Error checking for updates:', err);
    });
}

app.whenReady().then(() => {
    console.log('='.repeat(40));
    console.log('Sift');
    console.log('Version:', app.getVersion());
    console.log('='.repeat(40));

    app.setAppUserModelId("com.squirrel." + app.getName());

    createWindow();
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
        checkForUpdates();

    });

    win.once('ready-to-show', () => {
        win.center();
        win.show();
    });
}

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

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