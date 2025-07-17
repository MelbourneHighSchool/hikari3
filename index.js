const { app, BrowserWindow, nativeImage, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const ssh2 = require('ssh2')
const { exec } = require('child_process')
const dns = require('dns')

// Add this as a standalone function near the top
function scp(directoryPath, hostname, username, privateKeyFilename) {
  return new Promise((resolve, reject) => {
    // Get the private key path from identityfiles directory
    console.log(`Getting private key path for ${privateKeyFilename}`);
    console.log(privateKeyFilename)
    const keyPath = path.join(__dirname, 'interface', privateKeyFilename);
    console.log(`Private key path: ${keyPath}`);
    // Construct the scp command
    const scpCommand = `scp -r -i "${keyPath}" "${directoryPath}" ${username}@${hostname}:~/`;
    
    console.log(`Executing SCP command: ${scpCommand}`);
    
    exec(scpCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`SCP error: ${error}`);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.warn(`SCP stderr: ${stderr}`);
      }
      
      console.log(`SCP stdout: ${stdout}`);
      resolve(stdout);
    });
  });
}

const APP_ID = 'com.hikarios.app'
app.name = 'HIKARI OS'
app.setAppUserModelId(APP_ID)

// Add these functions for app data management
function loadAppData() {
  const appDataPath = path.join(__dirname, 'core', 'app_data.json')
  try {
    // Check if file exists
    if (fs.existsSync(appDataPath)) {
      const data = fs.readFileSync(appDataPath, 'utf8')
      return JSON.parse(data)
    } else {
      // Return default data structure if file doesn't exist
      return {
        themeSettings: {
          currentlySelected: "Purple",
          themes: [
            // Copy the themes from your existing app_data.json
            // ... existing theme data ...
          ]
        }
      }
    }
  } catch (error) {
    console.error('Error loading app data:', error)
    return null
  }
}

function saveAppData(data) {
  const appDataPath = path.join(__dirname, 'core', 'app_data.json')
  try {
    // Create a backup of the current file if it exists
    if (fs.existsSync(appDataPath)) {
      const backupPath = `${appDataPath}.backup`
      fs.copyFileSync(appDataPath, backupPath)
    }

    // Write the new data
    fs.writeFileSync(appDataPath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (error) {
    console.error('Error saving app data:', error)
    return false
  }
}

// Add this function before createWindow
function getAppFiles() {
  const appsPath = path.join(__dirname, 'interface', 'apps')
  const files = fs.readdirSync(appsPath)
  return files.filter(file => file.endsWith('.js'))
}

// Add this function to handle image saving
function saveBackgroundImage(imageData, filename) {
  try {
    // Remove data URL prefix to get just the base64 data
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Create backgrounds directory if it doesn't exist
    const backgroundsDir = path.join(__dirname, 'interface', 'backgrounds');
    if (!fs.existsSync(backgroundsDir)) {
      fs.mkdirSync(backgroundsDir, { recursive: true });
    }

    // Generate unique filename if file exists
    let finalFilename = filename;
    let counter = 1;
    while (fs.existsSync(path.join(backgroundsDir, finalFilename))) {
      const ext = path.extname(filename);
      const name = path.basename(filename, ext);
      finalFilename = `${name}_${counter}${ext}`;
      counter++;
    }

    // Save the file
    const filepath = path.join(backgroundsDir, finalFilename);
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    // Return the relative path for storing in theme data
    return `backgrounds/${finalFilename}`;
  } catch (error) {
    console.error('Error saving background image:', error);
    throw error;
  }
}

let mainWindow = null

// Create a map to store SSH connections
// Keys are hostname
// Values are an object with multiple ssh connections
// 1 connection for an interactive terminal, 1 connection for running the robot's core code
let sshConnections = new Map()
let readySSHConnections = {}

// Add this helper function
function resolveHostname(hostname) {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, (err, address) => {
      if (err) {
        console.error(`DNS lookup failed for ${hostname}:`, err);
        reject(err);
        return;
      }
      console.log(`Resolved ${hostname} to ${address}`);
      resolve(address);
    });
  });
}

// Add this helper function for cleaning up connections
function cleanupConnections(hostname) {
  console.log(`Cleaning up all SSH connections for ${hostname}`);
  if (sshConnections.has(hostname)) {
    const connection = sshConnections.get(hostname);
    // End both connections if they exist
    if (connection.terminal.client) {
      connection.terminal.client.end();
    }
    if (connection.core.client) {
      connection.core.client.end();
    }
    // Clean up the connection state
    readySSHConnections[hostname] = false;
    sshConnections.delete(hostname);
    // Notify renderer
    mainWindow.webContents.send('ssh-disconnected', hostname);
  }
}

// Update createSSHConnection to be async and use IP resolution
async function createSSHConnection(hostname, username, privateKey, privateKeyFilename, reset=false) {
  if (sshConnections.has(hostname)) {
    if (reset) {
      console.log(`Resetting existing SSH connections for ${hostname}`);
      if (sshConnections.get(hostname).terminal.client) {
        sshConnections.get(hostname).terminal.client.end();
      }
      if (sshConnections.get(hostname).core.client) {
        sshConnections.get(hostname).core.client.end();
      }
    } else {
      return;
    }
  }

  // Resolve IP address first
  let ip;
  try {
    ip = await resolveHostname(hostname);
  } catch (err) {
    console.error(`Failed to resolve hostname ${hostname}:`, err);
    mainWindow.webContents.send('ssh-error', hostname, 'Failed to resolve hostname');
    return;
  }

  sshConnections.set(hostname, {
    connected: false,
    terminal: {
      client: new ssh2.Client(),
      shell_stream: null,
      ready: false  // Add state tracking
    },
    core: {
      client: new ssh2.Client(),
      shell_stream: null,
      ready: false  // Add state tracking
    },
    privateKeyFilename: privateKeyFilename
  })

  console.log(`Creating SSH connections for ${hostname} (${ip})`);

  let connectedCount = 0;

  // Update the error handlers to use the cleanup function
  sshConnections.get(hostname).terminal.client.on('error', (err) => {
    console.log(`${hostname} terminal SSH error:`, err);
    console.log('Error code:', err.code);
    console.log('Error level:', err.level);
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      cleanupConnections(hostname);
    }
  });

  sshConnections.get(hostname).core.client.on('error', (err) => {
    console.log(`${hostname} core SSH error:`, err);
    console.log('Error code:', err.code);
    console.log('Error level:', err.level);
    if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
      cleanupConnections(hostname);
    }
  });

  // Also add close handlers
  sshConnections.get(hostname).terminal.client.on('close', () => {
    console.log(`${hostname} terminal SSH connection closed`);
    cleanupConnections(hostname);
  });

  sshConnections.get(hostname).core.client.on('close', () => {
    console.log(`${hostname} core SSH connection closed`);
    cleanupConnections(hostname);
  });

  // Add connection attempt logging
  sshConnections.get(hostname).terminal.client.on('connect', () => {
    console.log(`${hostname} terminal SSH attempting connection...`);
  });

  sshConnections.get(hostname).core.client.on('connect', () => {
    console.log(`${hostname} core SSH attempting connection...`);
  });

  // Add handshake logging
  sshConnections.get(hostname).terminal.client.on('handshake', () => {
    console.log(`${hostname} terminal SSH handshake complete`);
  });

  sshConnections.get(hostname).core.client.on('handshake', () => {
    console.log(`${hostname} core SSH handshake complete`);
  });

  // Update ready handlers
  sshConnections.get(hostname).terminal.client.on('ready', () => {
    console.log(`${hostname} terminal SSH connection ready`);
    sshConnections.get(hostname).terminal.ready = true;

    sshConnections.get(hostname).terminal.client.shell((err, stream) => {
      if (err) {
        console.error(`${hostname} terminal shell error:`, err);
        throw err;
      }
      console.log(`${hostname} terminal shell created successfully`);
      sshConnections.get(hostname).terminal.shell_stream = stream;

      stream.on('error', (err) => {
        console.error(`${hostname} terminal stream error:`, err);
      });

      stream.on('close', () => {
        console.log(`${hostname} terminal stream closed`);
      });

      stream.on('data', (data) => {
        console.log(`${hostname} terminal data: ${data}`);
        mainWindow.webContents.send('ssh-data', hostname, 'terminal', data);
      });
    });

    connectedCount++;
    if (connectedCount === 2) {
      allReady(hostname);
    }
  });

  sshConnections.get(hostname).core.client.on('ready', () => {
    console.log(`${hostname} core SSH connection ready`);
    sshConnections.get(hostname).core.ready = true;

    sshConnections.get(hostname).core.client.shell((err, stream) => {
      if (err) {
        console.error(`${hostname} core shell error:`, err);
        throw err;
      }
      console.log(`${hostname} core shell created successfully`);
      sshConnections.get(hostname).core.shell_stream = stream;

      stream.on('error', (err) => {
        console.error(`${hostname} core stream error:`, err);
      });

      stream.on('close', () => {
        console.log(`${hostname} core stream closed`);
      });

      stream.on('data', (data) => {
        console.log(`${hostname} core data: ${data}`);
        mainWindow.webContents.send('ssh-data', hostname, 'core', data);
      });
    });

    connectedCount++;
    if (connectedCount === 2) {
      allReady(hostname);
    }
  });

  function allReady(hostname) {
    console.log(`${hostname} all SSH connections ready !!!!!!`);
    sshConnections.get(hostname).connected = true;
    readySSHConnections[hostname] = true;
    mainWindow.webContents.send('ssh-ready', hostname);

    // After connection is ready, upload core directory
    const corePath = path.join(__dirname, 'core');
    console.log(`Uploading core directory to ${hostname}...`);
    
    scp(corePath, hostname, username, privateKeyFilename)
      .then(() => {
        console.log(`Successfully uploaded core directory to ${hostname}`);
        mainWindow.webContents.send('core-upload-complete', hostname);
      })
      .catch((error) => {
        console.error(`Failed to upload core directory to ${hostname}:`, error);
        mainWindow.webContents.send('core-upload-failed', hostname, error.message);
      });
  }
  
  // Use resolved IP for both connections immediately
  sshConnections.get(hostname).terminal.client.connect({
    host: ip,
    port: 22,
    username: username,
    privateKey: privateKey
  });

  sshConnections.get(hostname).core.client.connect({
    host: ip,
    port: 22,
    username: username,
    privateKey: privateKey
  });
}


// When the process closes, close all SSH connections
process.on('SIGINT', () => {
  console.log('Closing all SSH connections...');
  sshConnections.forEach((connection, hostname) => {
    connection.terminal.end();
    connection.core.end();
  });
  process.exit();
});


//
app.whenReady().then(() => {
  // Set up ALL IPC handlers first
  ipcMain.handle('get-app-data', () => {
    return loadAppData()
  })

  ipcMain.handle('create-ssh-connection', (event, { hostname, username, privateKey, privateKeyFilename, reset=false }) => {
    createSSHConnection(hostname, username, privateKey, privateKeyFilename, reset)
  })

  ipcMain.handle('send-message-to-ssh', (event, { hostname, connectionName, message }) => {
    console.log(`Sending message to ${hostname} ${connectionName}: ${message}`)
    // console.log(sshConnections.get(hostname))
    if(sshConnections.get(hostname) && sshConnections.get(hostname)[connectionName]) {
      sshConnections.get(hostname)[connectionName].shell_stream.write(message)
    } else {
      console.log(`No connection found for ${hostname} ${connectionName}`)
      // send ssh-disconnected message to renderer process
      mainWindow.webContents.send('ssh-disconnected', hostname)

      readySSHConnections[hostname] = false
    }
  })

  ipcMain.handle('save-app-data', (event, data) => {
    const success = saveAppData(data)
    if (success) {
      return data
    }
    throw new Error('Failed to save app data')
  })

  ipcMain.handle('get-app-files', () => {
    return getAppFiles()
  })

  ipcMain.handle('save-background-image', async (event, { imageData, filename }) => {
    return saveBackgroundImage(imageData, filename)
  })

  ipcMain.handle('read-identity-file', (event, { filename }) => {
    if(filename.includes('.') || filename.includes('/') || filename.includes('\\')) {
      console.log(`Someone tried to access ${filename} through the identity file system (caught by .)`)
      return;
    };

    const identityDir = path.join(__dirname, 'interface', 'identityfiles');
    const filepath = path.join(identityDir, filename);

    // check if filepath is a child of identityDir
    if (!filepath.startsWith(identityDir)) {
      console.log(`Someone tried to access ${filepath} through the identity file system (caught by prefix)`)
      return;
    }

    return fs.readFileSync(filepath, 'utf8');
  })

  ipcMain.handle('save-identity-file', async (event, { fileData, filename }) => {
    // Create identityfiles directory if it doesn't exist
    const identityDir = path.join(__dirname, 'interface', 'identityfiles');
    if (!fs.existsSync(identityDir)) {
        fs.mkdirSync(identityDir, { recursive: true });
    }

    // Extract base64 data
    const base64Data = fileData.replace(/^data:.+;base64,/, '');

    // Generate unique filename to avoid conflicts
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(identityDir, uniqueFilename);

    // Save the file
    await fs.promises.writeFile(filePath, base64Data, 'base64');

    // Return the relative path for storage in profile
    return path.join('identityfiles', uniqueFilename);
  })

  ipcMain.handle('test-ssh-connection', async (event, profile) => {
    let online = await testSSHConnection(profile);
    let ready = readySSHConnections[profile.hostname] // this is set in createSSHConnection

    console.log(`${profile.hostname} is ${online ? 'online' : 'offline'} and ready is ${ready}`)

    if(online) {
      createSSHConnection(profile.hostname, profile.username, profile.privateKey, profile.identityFile)
    }

    return online && ready
  });

  ipcMain.handle('get-ssh-profiles', async (event) => {
    const appDataPath = path.join(__dirname, 'core', 'app_data.json');
    try {
      console.log('Loading SSH profiles from:', appDataPath);
      const data = fs.readFileSync(appDataPath, 'utf8');
      const appData = JSON.parse(data);
      
      // Convert the array structure to an object structure
      const profiles = {};
      if (appData.sshProfiles && appData.sshProfiles.profiles) {
        console.log('Found', appData.sshProfiles.profiles.length, 'SSH profiles');
        appData.sshProfiles.profiles.forEach(profile => {
          console.log('Processing profile:', profile.name);
          const keyPath = path.join(__dirname, 'interface', profile.identityFile);
          if (!profile.identityFile) {
            console.log('Missing private key, skipping read');
          } else {
            console.log('Reading private key from:', keyPath);
          }
          
          profiles[profile.name] = {
            hostname: profile.hostname,
            username: profile.username,
            privateKey: profile.identityFile ? fs.readFileSync(keyPath, 'utf8') : "",
            identityFile: profile.identityFile
          };
        });
      } else {
        console.log('No SSH profiles found in app_data.json');
      }
      return profiles;
    } catch (error) {
      console.error('Error loading SSH profiles:', error);
      return {};
    }
  });

  // Get the file tree for core
  ipcMain.handle('get-core-files', async (event) => {
    const corePath = path.join(__dirname, 'core');
    
    function buildFileTree(dir) {
      const items = fs.readdirSync(dir);
      const result = [];
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const relativePath = path.relative(corePath, fullPath);
        const stats = fs.statSync(fullPath);
        
        if (stats.isDirectory()) {
          result.push({
            type: 'folder',
            name: item,
            children: buildFileTree(fullPath)
          });
        } else {
          result.push({
            type: 'file',
            name: item
          });
        }
      }
      
      return result;
    }

    try {
      return {
        type: 'folder',
        name: 'core',
        children: buildFileTree(corePath)
      };
    } catch (error) {
      console.error('Error getting core files:', error);
      throw error;
    }
  });

  // Get contents of a file in core
  ipcMain.handle('get-core-file', async (event, filename) => {
    console.log(`Getting core file: ${filename}`)

    if(filename.startsWith('core')) {
      filename = filename.slice(4);
      
      if(filename.startsWith('/')) {
        filename = filename.slice(1);
      }
    }
    

    // Validate filename
    if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
      throw new Error('Invalid filename');
    }

    const corePath = path.join(__dirname, 'core');
    const filePath = path.join(corePath, filename);

    // Verify the file is within the core directory
    if (!filePath.startsWith(corePath)) {
      throw new Error('File access denied');
    }

    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
      console.error('Error reading core file:', error);
      throw error;
    }
  });

  // Save contents to a file in core
  ipcMain.handle('save-core-file', async (event, { filename, content }) => {
    // Validate filename
    if (filename.includes('..') || filename.startsWith('/') || filename.startsWith('\\')) {
      throw new Error('Invalid filename');
    }

    if(filename.startsWith('core/')) {
      filename = filename.slice(5);
    }

    const corePath = path.join(__dirname, 'core');
    const filePath = path.join(corePath, filename);

    // Verify the file is within the core directory
    if (!filePath.startsWith(corePath)) {
      throw new Error('File access denied');
    }

    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return true;
    } catch (error) {
      console.error('Error saving core file:', error);
      throw error;
    }
  });

  // Create a new file in core
  ipcMain.handle('create-core-file', async (event, { path: dirPath, name }) => {
    // Validate filename
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('Invalid filename');
    }

    if(dirPath.startsWith('core')) {
      dirPath = dirPath.slice(4);
      
      if(dirPath.startsWith('/')) {
        dirPath = dirPath.slice(1);
      }
    }

    // Validate directory path
    if (dirPath.includes('..') || dirPath.startsWith('/') || dirPath.startsWith('\\')) {
      throw new Error('Invalid directory path');
    }

    const corePath = path.join(__dirname, 'core');
    const fullPath = path.join(corePath, dirPath, name);

    // Verify the file will be within the core directory
    if (!fullPath.startsWith(corePath)) {
      throw new Error('File creation denied: outside core directory');
    }

    try {
      console.log(`Trying to create file ${fullPath}`)

      // Check if file already exists
      if (fs.existsSync(fullPath)) {
        throw new Error('File already exists');
      }

      // Create empty file
      fs.writeFileSync(fullPath, '', 'utf8');
      return true;
    } catch (error) {
      console.error('Error creating file:', error);
      throw error;
    }
  });

  // Create a new folder in core
  ipcMain.handle('create-core-folder', async (event, { path: dirPath, name }) => {
    // Validate folder name
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
      throw new Error('Invalid folder name');
    }

    if(dirPath.startsWith('core')) {
      dirPath = dirPath.slice(4);
      
      if(dirPath.startsWith('/')) {
        dirPath = dirPath.slice(1);
      }
    }

    // Validate directory path
    if (dirPath.includes('..') || dirPath.startsWith('/') || dirPath.startsWith('\\')) {
      throw new Error('Invalid directory path');
    }

    const corePath = path.join(__dirname, 'core');
    const fullPath = path.join(corePath, dirPath, name);

    // Verify the folder will be within the core directory
    if (!fullPath.startsWith(corePath)) {
      throw new Error('Folder creation denied: outside core directory');
    }

    try {
      // Check if folder already exists
      if (fs.existsSync(fullPath)) {
        throw new Error('Folder already exists');
      }

      // Create folder
      fs.mkdirSync(fullPath);
      return true;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  });

  // Add this with other IPC handlers
  ipcMain.handle('rename-core-item', async (event, { path: itemPath, newName }) => {
    // Validate new name
    if (newName.includes('..') || newName.includes('/') || newName.includes('\\')) {
      throw new Error('Invalid name');
    }

    if(itemPath.startsWith('core')) {
      itemPath = itemPath.slice(4);
      if(itemPath.startsWith('/')) {
        itemPath = itemPath.slice(1);
      }
    }

    // Validate path
    if (itemPath.includes('..') || itemPath.startsWith('/') || itemPath.startsWith('\\')) {
      throw new Error('Invalid path');
    }

    const corePath = path.join(__dirname, 'core');
    const oldPath = path.join(corePath, itemPath);
    const newPath = path.join(path.dirname(oldPath), newName);

    // Verify both paths are within the core directory
    if (!oldPath.startsWith(corePath) || !newPath.startsWith(corePath)) {
      throw new Error('Path access denied');
    }

    try {
      // Check if target already exists
      if (fs.existsSync(newPath)) {
        throw new Error('An item with that name already exists');
      }

      // Rename the file/folder
      fs.renameSync(oldPath, newPath);
      return true;
    } catch (error) {
      console.error('Error renaming item:', error);
      throw error;
    }
  });

  // Add this helper function at the top with other utility functions
  function getTimestampedName(originalName) {
    const now = new Date();
    const timestamp = [
      now.getDate().toString().padStart(2, '0'),
      (now.getMonth() + 1).toString().padStart(2, '0'),
      now.getFullYear(),
      now.getHours().toString().padStart(2, '0'),
      now.getMinutes().toString().padStart(2, '0'),
      now.getSeconds().toString().padStart(2, '0')
    ].join('-');
    
    return `${timestamp}-${originalName}`;
  }

  // Update the delete handler
  ipcMain.handle('delete-core-item', async (event, { path: itemPath }) => {
    if(itemPath.startsWith('core')) {
      itemPath = itemPath.slice(4);
      if(itemPath.startsWith('/')) {
        itemPath = itemPath.slice(1);
      }
    }

    // Validate path
    if (itemPath.includes('..') || itemPath.startsWith('/') || itemPath.startsWith('\\')) {
      throw new Error('Invalid path');
    }

    const corePath = path.join(__dirname, 'core');
    const fullPath = path.join(corePath, itemPath);
    const recycleBinPath = path.join(__dirname, 'interface', 'recycle_bin');

    // Verify the path is within the core directory
    if (!fullPath.startsWith(corePath)) {
      throw new Error('Path access denied');
    }

    try {
      // Create recycle_bin if it doesn't exist
      if (!fs.existsSync(recycleBinPath)) {
        fs.mkdirSync(recycleBinPath, { recursive: true });
      }

      // Check if path exists
      if (!fs.existsSync(fullPath)) {
        throw new Error('Item does not exist');
      }

      const itemName = path.basename(fullPath);
      const timestampedName = getTimestampedName(itemName);
      const recyclePath = path.join(recycleBinPath, timestampedName);

      // Check if it's a directory
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        // Copy directory to recycle bin
        fs.cpSync(fullPath, recyclePath, { recursive: true });
        // Delete original
        fs.rmdirSync(fullPath, { recursive: true });
      } else {
        // Copy file to recycle bin
        fs.copyFileSync(fullPath, recyclePath);
        // Delete original
        fs.unlinkSync(fullPath);
      }
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  });

  // Add duplicate handler
  ipcMain.handle('duplicate-core-item', async (event, { path: itemPath }) => {
    if(itemPath.startsWith('core')) {
      itemPath = itemPath.slice(4);
      if(itemPath.startsWith('/')) {
        itemPath = itemPath.slice(1);
      }
    }

    // Validate path
    if (itemPath.includes('..') || itemPath.startsWith('/') || itemPath.startsWith('\\')) {
      throw new Error('Invalid path');
    }

    const corePath = path.join(__dirname, 'core');
    const fullPath = path.join(corePath, itemPath);

    // Verify the path is within the core directory
    if (!fullPath.startsWith(corePath)) {
      throw new Error('Path access denied');
    }

    try {
      const dir = path.dirname(fullPath);
      const ext = path.extname(fullPath);
      const baseName = path.basename(fullPath, ext);
      
      // Find a unique name
      let counter = 1;
      let newPath;
      do {
        const newName = `${baseName} (${counter})${ext}`;
        newPath = path.join(dir, newName);
        counter++;
      } while (fs.existsSync(newPath));

      // Check if it's a directory
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        fs.cpSync(fullPath, newPath, { recursive: true });
      } else {
        fs.copyFileSync(fullPath, newPath);
      }
      return true;
    } catch (error) {
      console.error('Error duplicating item:', error);
      throw error;
    }
  });

  // Add move handler
  ipcMain.handle('move-core-item', async (event, { sourcePath, targetPath }) => {
    if(sourcePath.startsWith('core')) {
      sourcePath = sourcePath.slice(4);
      if(sourcePath.startsWith('/')) {
        sourcePath = sourcePath.slice(1);
      }
    }
    
    if(targetPath.startsWith('core')) {
      targetPath = targetPath.slice(4);
      if(targetPath.startsWith('/')) {
        targetPath = targetPath.slice(1);
      }
    }

    // Validate paths
    if (sourcePath.includes('..') || sourcePath.startsWith('/') || sourcePath.startsWith('\\') ||
        targetPath.includes('..') || targetPath.startsWith('/') || targetPath.startsWith('\\')) {
      throw new Error('Invalid path');
    }

    const corePath = path.join(__dirname, 'core');
    const sourceFull = path.join(corePath, sourcePath);
    const sourceBasename = path.basename(sourceFull);
    const targetFull = path.join(corePath, targetPath, sourceBasename);

    // Verify paths are within core directory
    if (!sourceFull.startsWith(corePath) || !targetFull.startsWith(corePath)) {
      throw new Error('Path access denied');
    }

    // Don't allow moving a folder into itself or its children
    if (targetFull.startsWith(sourceFull + path.sep)) {
      throw new Error('Cannot move a folder into itself');
    }

    try {
      // Check if target already exists
      if (fs.existsSync(targetFull)) {
        throw new Error('An item with that name already exists in the target folder');
      }

      // Move the item
      fs.renameSync(sourceFull, targetFull);
      return true;
    } catch (error) {
      console.error('Error moving item:', error);
      throw error;
    }
  });

  // Add this with other IPC handlers
  ipcMain.handle('create-core-snapshot', async (event, { name }) => {
    // Validate snapshot name
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        throw new Error('Invalid snapshot name');
    }

    const timestamp = Date.now();
    const snapshotName = `${timestamp}-${name}`;
    
    const corePath = path.join(__dirname, 'core');
    const snapshotsPath = path.join(__dirname, 'snapshots');
    const snapshotPath = path.join(snapshotsPath, snapshotName);

    try {
        // Create snapshots directory if it doesn't exist
        if (!fs.existsSync(snapshotsPath)) {
            fs.mkdirSync(snapshotsPath, { recursive: true });
        }

        // Check if snapshot already exists
        if (fs.existsSync(snapshotPath)) {
            throw new Error('Snapshot with this name already exists');
        }

        // Copy core directory to snapshot directory
        fs.cpSync(corePath, snapshotPath, { recursive: true });

        return true;
    } catch (error) {
        console.error('Error creating snapshot:', error);
        throw error;
    }
  });

  // Update the list-core-snapshots handler
  ipcMain.handle('list-core-snapshots', async (event) => {
    const snapshotsPath = path.join(__dirname, 'snapshots');
    
    try {
        // Create snapshots directory if it doesn't exist
        if (!fs.existsSync(snapshotsPath)) {
            fs.mkdirSync(snapshotsPath, { recursive: true });
            return [];
        }

        // Get list of snapshot directories
        const snapshots = fs.readdirSync(snapshotsPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => {
                const parts = dirent.name.split('-');
                const timestamp = parseInt(parts[0]);
                const name = parts.slice(1).join('-');
                return {
                    fullName: dirent.name,
                    displayName: name,
                    timestamp: timestamp || 0 // fallback for any existing snapshots without timestamp
                };
            })
            .sort((a, b) => b.timestamp - a.timestamp)
            .map(snapshot => snapshot.fullName);

        return snapshots;
    } catch (error) {
        console.error('Error listing snapshots:', error);
        throw error;
    }
  });

  ipcMain.handle('restore-core-snapshot', async (event, { name }) => {
    // Validate snapshot name
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        throw new Error('Invalid snapshot name');
    }

    const corePath = path.join(__dirname, 'core');
    const snapshotsPath = path.join(__dirname, 'snapshots');
    const snapshotPath = path.join(snapshotsPath, name);
    const recycleBinPath = path.join(__dirname, 'recycle_bin');

    try {
        // Verify snapshot exists
        if (!fs.existsSync(snapshotPath)) {
            throw new Error('Snapshot does not exist');
        }

        // Create recycle_bin if it doesn't exist
        if (!fs.existsSync(recycleBinPath)) {
            fs.mkdirSync(recycleBinPath, { recursive: true });
        }

        // Copy current core to recycle bin with timestamp
        const timestamp = getTimestampedName('core-restore');
        const recyclePath = path.join(recycleBinPath, timestamp);
        fs.cpSync(corePath, recyclePath, { recursive: true });

        console.log('saving backup to recycle bin')

        // Delete current core contents
        fs.rmSync(corePath, { recursive: true, force: true });
        fs.mkdirSync(corePath);

        // Copy snapshot to core
        fs.cpSync(snapshotPath, corePath, { recursive: true });

        return true;
    } catch (error) {
        console.error('Error restoring snapshot:', error);
        throw error;
    }
  });

  // Add these new handlers
  ipcMain.handle('rename-core-snapshot', async (event, { oldName, newName }) => {
    // Validate names
    if (newName.includes('..') || newName.includes('/') || newName.includes('\\')) {
        throw new Error('Invalid snapshot name');
    }

    const snapshotsPath = path.join(__dirname, 'snapshots');
    const oldPath = path.join(snapshotsPath, oldName);
    const timestamp = oldName.split('-')[0];
    const newFullName = `${timestamp}-${newName}`;
    const newPath = path.join(snapshotsPath, newFullName);

    try {
        // Check if target already exists
        if (fs.existsSync(newPath)) {
            throw new Error('A snapshot with that name already exists');
        }

        // Rename the snapshot
        fs.renameSync(oldPath, newPath);
        return true;
    } catch (error) {
        console.error('Error renaming snapshot:', error);
        throw error;
    }
  });

  ipcMain.handle('delete-core-snapshot', async (event, { name }) => {
    // Validate name
    if (name.includes('..') || name.includes('/') || name.includes('\\')) {
        throw new Error('Invalid snapshot name');
    }

    const snapshotsPath = path.join(__dirname, 'snapshots');
    const snapshotPath = path.join(snapshotsPath, name);

    try {
        // Verify snapshot exists
        if (!fs.existsSync(snapshotPath)) {
            throw new Error('Snapshot does not exist');
        }

        // Delete the snapshot
        fs.rmSync(snapshotPath, { recursive: true });
        return true;
    } catch (error) {
        console.error('Error deleting snapshot:', error);
        throw error;
    }
  });

  // Add this with other IPC handlers
  ipcMain.handle('scp-directory', async (event, { directoryPath, hostname, username, privateKeyFilename }) => {
    try {
      await scp(directoryPath, hostname, username, privateKeyFilename);
      return true;
    } catch (error) {
      console.error('SCP failed:', error);
      throw error;
    }
  });

  // Then create window
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

function createWindow () {
  const iconPath = path.join(__dirname, 'interface', 'icon.png')
  const icon = nativeImage.createFromPath(iconPath)

  mainWindow = new BrowserWindow({
    show: false,
    frame: false,
    icon: icon,
    title: 'HIKARI OS',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  //

app.on('ready', () => {
  // Modify the origin for all requests to the following urls.
  const filter = {
    urls: ['http://example.com/*']
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(
    filter,
    (details, callback) => {
      console.log(details);
      details.requestHeaders['Origin'] = 'http://example.com';
      callback({ requestHeaders: details.requestHeaders });
    }
  );

  session.defaultSession.webRequest.onHeadersReceived(
    filter,
    (details, callback) => {
      console.log(details);
      details.responseHeaders['Access-Control-Allow-Origin'] = [
        'capacitor-electron://-'
      ];
      callback({ responseHeaders: details.responseHeaders });
    }
  );

  myCapacitorApp.init();
});

  //

  mainWindow.setFullScreen(true)
  mainWindow.show()
  mainWindow.loadFile('interface/index.html')
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})