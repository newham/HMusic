const { app, BrowserWindow, ipcMain, Menu, Tray, MenuItem, nativeTheme, nativeImage, dialog, screen } = require('electron')
const path = require("path")
var win = null;
var saved = false;
var isClosing = false;
app.allowRendererProcessReuse = true; // 修复现实启动报错
var openFile = '';
var trayIcon = null;
var trayNext = null;
var trayPre = null;
var trayStopAndStartNext = null;

function createMenu() {
    var template = [{
        label: "Demo",
        submenu: [
            { label: "退出", accelerator: "CmdOrCtrl+Q", click: function() { win.close() } },
            { type: 'separator' },
            {
                label: "关于",
                click: function() {
                    app.showAboutPanel()
                }
            },
        ]
    }];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template))
        //设置dock
    const dockMenu = Menu.buildFromTemplate([{
        label: '新窗口',
        click() {}
    }])
    app.dock.setMenu(dockMenu);
}

function createWindow() {
    // 创建菜单
    createMenu();
    // 创建tray
    createTray();
    // 创建窗口
    createIndexWindow();
}

function createIndexWindow() {
    // 创建浏览器窗口
    win = new BrowserWindow({
        title: "H-Music",
        // titleBarStyle: "hiddenInset",
        // transparent:true, //透明度
        // opacity:0.99,
        width: 520,
        minWidth: 520,
        maxWidth: 520,
        height: 520,
        minHeight: 520,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.on('close', (e) => {
        if (!saved) {
            win.minimize();
            e.preventDefault();
        }
        //如果保存成功，直接关闭
    });

    // 并且为你的应用加载index.html
    win.loadFile('index.html');

    // 打开开发者工具
    if (process.argv.includes('-t')) {
        win.webContents.openDevTools();
    }
}

let isStart = true;

function createTray() {
    trayIcon = new Tray(path.join(__dirname, 'static/img/tray-black.png'));
    trayNext = new Tray(path.join(__dirname, 'static/img/next.png'));
    trayStopAndStartNext = new Tray(path.join(__dirname, 'static/img/stop.png'));
    trayPre = new Tray(path.join(__dirname, 'static/img/previous.png'));
    const contextMenu = Menu.buildFromTemplate([
        // { label: '暂停', click: () => {} },
        { label: '主窗口', click: () => { win.restore() } },
        { type: 'separator' },
        {
            label: '暂停/播放',
            click: () => {
                if (isStart) {
                    win.webContents.send('play', 'stop');
                } else {
                    win.webContents.send('play', 'start');
                }
                isStart = !isStart;
            }
        },
        { label: '上一首', click: () => { win.webContents.send('play', 'previous'); } },
        { label: '下一首', click: () => { win.webContents.send('play', 'next'); } },
        { type: 'separator' },
        { label: '退出', click: () => { app.quit() } },
    ]);
    // tray.setTitle('下一首')
    trayIcon.setToolTip('HMusic');
    trayIcon.setContextMenu(contextMenu);
    trayNext.on('click', () => {
        win.webContents.send('play', 'next');
    })
    trayPre.on('click', () => {
        win.webContents.send('play', 'previous');
    })
    trayStopAndStartNext.on('click', () => {
        if (isStart) {
            trayStopAndStartNext.setImage(path.join(__dirname, 'static/img/start.png'))
            win.webContents.send('play', 'stop');
        } else {
            trayStopAndStartNext.setImage(path.join(__dirname, 'static/img/stop.png'))
            win.webContents.send('play', 'start');
        }
        isStart = !isStart;
    })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// 部分 API 在 ready 事件触发后才能使用。
app.whenReady().then(createWindow);

// dock右键退出时触发
app.on('before-quit', (e) => {
    if (!saved) {
        e.preventDefault();
        win.webContents.send('closing', '');
    }
})

// 等待保存结束退出
ipcMain.on('saved', (event, id) => {
    saved = true;
    app.quit();
});

// 等待保存结束退出
ipcMain.on('get-opened-file', (event, id) => {
    event.reply('opened-file', openFile);
});

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (!win) {
        createWindow();
    }
})

// 主进程 消息队列
ipcMain.on('test', (event, id) => {
    console.log('call back from win:', id);
    showOpenFileWin((ok) => {
        if (ok) {
            resetGlobalData(id);
            event.reply('openImg-cb', 'ok');
        } else {
            event.reply('openImg-cb', 'failed');
        }
    })
})

//切换暗-亮模式触发
nativeTheme.on('updated', () => {
    isDark = nativeTheme.shouldUseDarkColors;
    BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send('themeChanged', isDark);
    })
})

// Event fired When someone drags files onto the icon while your app is running
// 双击打开图片、将图片拖动到dock图标触发，直接创建新窗口
app.on("open-file", (event, file) => {
    openFile = file;
    console.log('open', openFile);

    if (app.isReady()) {
        //程序已经启动，新开一个窗口
        // createWindow();
        // 发送一个消息
        win.webContents.send('opened-file', openFile);
    }

    event.preventDefault();
});