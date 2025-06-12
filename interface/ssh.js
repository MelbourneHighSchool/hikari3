// Store active connections for tracking status
const activeConnections = new Map();

// Create SSH connection
async function createSSHConnection(hostname, username, privateKey, privateKeyFilename, reset = false) {
    try {
        await ipcRenderer.invoke('create-ssh-connection', {
            hostname,
            username,
            privateKey,
            privateKeyFilename,
            reset
        });
        
        // Initialize connection tracking if needed
        if (!activeConnections.has(hostname)) {
            activeConnections.set(hostname, {
                connected: false,
                username: username
            });
        }
    } catch (error) {
        console.error('Failed to create SSH connection:', error);
        throw error;
    }
}

// Send message to SSH connection
async function sendSSHMessage(hostname, connectionName, message) {
    try {
        await ipcRenderer.invoke('send-message-to-ssh', {
            hostname,
            connectionName, // 'terminal' or 'core'
            message
        });
    } catch (error) {
        console.error('Failed to send SSH message:', error);
        throw error;
    }
}

// Handle incoming SSH data
ipcRenderer.on('ssh-data', (event, hostname, connectionName, data) => {
    console.log(`SSH data from ${hostname} ${connectionName}:`, String.fromCharCode(...data));
    // Emit a custom event that other parts of the application can listen to
    const sshDataEvent = new CustomEvent('ssh-data-received', {
        detail: {
            hostname,
            connectionName,
            data
        }
    });
    window.dispatchEvent(sshDataEvent);
});

// Handle SSH connection ready status
ipcRenderer.on('ssh-ready', (event, hostname) => {
    console.log(`SSH connection ready for ${hostname} [ssh-ready]`);
    
    if (activeConnections.has(hostname)) {
        activeConnections.get(hostname).connected = true;
    }

    // Find the profile name for this hostname
    const profileName = Object.entries(window.robotConnections.profiles)
        .find(([name, profile]) => profile.hostname === hostname)?.[0];

    if (profileName) {
        // Add to connected set and update display
        window.robotConnections.connected.add(profileName);
        RobotManager.updateConnectionDisplay();
    }
    
    // Emit a custom event for connection ready
    const sshReadyEvent = new CustomEvent('ssh-connection-ready', {
        detail: {
            hostname
        }
    });
    window.dispatchEvent(sshReadyEvent);
});

// handle ssh disconnection
ipcRenderer.on('ssh-disconnected', (event, hostname) => {
    console.log(`SSH connection disconnected for ${hostname}`);
    activeConnections.delete(hostname);

    // Find the profile name for this hostname
    const profileName = Object.entries(window.robotConnections.profiles)
        .find(([name, profile]) => profile.hostname === hostname)?.[0];

    if (profileName) {
        // Remove from connected set and update display
        window.robotConnections.connected.delete(profileName);
        RobotManager.updateConnectionDisplay();
    }

    // emit a custom event for connection disconnected
    const sshDisconnectedEvent = new CustomEvent('ssh-connection-disconnected', {
        detail: {
            hostname
        }
    });
    window.dispatchEvent(sshDisconnectedEvent);
});

// Utility function to check connection status
function isSSHConnected(hostname) {
    return activeConnections.has(hostname) && activeConnections.get(hostname).connected;
}

// Read an identity file
async function readIdentityFile(filename) {
    try {
        const privateKey = await ipcRenderer.invoke('read-identity-file', { filename });
        if (!privateKey) {
            throw new Error('Failed to read identity file or access was denied');
        }
        return privateKey;
    } catch (error) {
        console.error('Failed to read identity file:', error);
        throw error;
    }
}

// Connect using a profile name from app_data.json
async function connectWithProfile(profileName) {
    try {
        // Get app data
        const appData = await ipcRenderer.invoke('get-app-data');
        
        // Find the profile
        const profile = appData.sshProfiles.profiles.find(p => p.name === profileName);
        if (!profile) {
            throw new Error(`Profile ${profileName} not found`);
        }

        // Get the identity file content
        // Convert Windows path separator to standard
        const identityFileName = profile.identityFile.replace('identityfiles\\', '');
        const privateKey = await readIdentityFile(identityFileName);

        // Create the SSH connection
        await createSSHConnection(profile.hostname, profile.username, privateKey, identityFileName);
        
        console.log(`Connected to ${profile.name} at ${profile.hostname}`);
    } catch (error) {
        console.error('Failed to connect with profile:', error);
        throw error;
    }
}

// Add this function with other SSH-related functions
async function scpDirectory(directoryPath, hostname, username, privateKeyFilename) {
    try {
        const result = await ipcRenderer.invoke('scp-directory', {
            directoryPath,
            hostname,
            username,
            privateKeyFilename
        });
        
        if (!result) {
            throw new Error('SCP operation failed');
        }
        
        console.log(`Successfully copied ${directoryPath} to ${hostname}`);
        return true;
    } catch (error) {
        console.error('Failed to SCP directory:', error);
        throw error;
    }
}

// Handle core upload events
ipcRenderer.on('core-upload-complete', (event, hostname) => {
    console.log(`Core directory upload completed for ${hostname}`);
    // Emit a custom event that other parts of the application can listen to
    const uploadCompleteEvent = new CustomEvent('core-upload-complete', {
        detail: { hostname }
    });
    window.dispatchEvent(uploadCompleteEvent);
});

ipcRenderer.on('core-upload-failed', (event, hostname, errorMessage) => {
    console.error(`Core directory upload failed for ${hostname}: ${errorMessage}`);
    // Emit a custom event that other parts of the application can listen to
    const uploadFailedEvent = new CustomEvent('core-upload-failed', {
        detail: { hostname, error: errorMessage }
    });
    window.dispatchEvent(uploadFailedEvent);
});

// Make them all global functions
window.createSSHConnection = createSSHConnection;
window.sendSSHMessage = sendSSHMessage;
window.isSSHConnected = isSSHConnected;
window.activeConnections = activeConnections;
window.readIdentityFile = readIdentityFile;
window.connectWithProfile = connectWithProfile;
window.scpDirectory = scpDirectory;
