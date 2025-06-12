class RobotManager {
    static async initializeConnections() {
        console.log('Initializing robot connections...');
        // Get all SSH profiles
        const profiles = await window.ipcRenderer.invoke('get-ssh-profiles');
        console.log('Received profiles:', Object.keys(profiles));
        window.robotConnections.profiles = profiles;
        
        // Initialize websocket connections object
        window.robotConnections.websockets = {};
        
        // Try to connect to each robot
        for (const [name, profile] of Object.entries(profiles)) {
            console.log(`Attempting to connect to robot: ${name}`);
            this.tryConnect(name, profile);
            this.initializeWebSocket(name, profile);
        }
        
        this.updateConnectionDisplay();
    }

    static initializeWebSocket(name, profile) {
        const ws = new WebSocket(`ws://${profile.hostname}:5000`);
        
        ws.onopen = () => {
            console.log(`WebSocket connected to ${name}`);
            window.robotConnections.websockets[name] = ws;
            this.updateConnectionDisplay();
            
            // Send initial app data when websocket connects
            this.sendAppData(name);
        };
        
        ws.onclose = () => {
            console.log(`WebSocket disconnected from ${name}`);
            delete window.robotConnections.websockets[name];
            this.updateConnectionDisplay();
            
            // Try to reconnect after a delay
            setTimeout(() => this.initializeWebSocket(name, profile), 5000);
        };
        
        ws.onerror = (error) => {
            console.error(`WebSocket error for ${name}:`, error);
            delete window.robotConnections.websockets[name];
            this.updateConnectionDisplay();
        };
        
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                // Handle different message types
                switch (message.type) {
                    case 'status':
                        console.log(`Motor status from ${name}:`, message.motors);
                        break;
                    case 'drive_response':
                        console.log(`Drive response from ${name}:`, message);
                        break;
                    case 'stop_response':
                        console.log(`Stop response from ${name}:`, message);
                        break;
                    default:
                        console.log(`Unknown message type from ${name}:`, message);
                }
            } catch (e) {
                console.error(`Error parsing message from ${name}:`, e);
            }
        };
    }

    static async tryConnect(name, profile) {
        try {
            console.log(`Testing connection to ${name} (${profile.hostname})`);
            const connected = await window.ipcRenderer.invoke('test-ssh-connection', profile);
            console.log(`Connection test result for ${name}: ${connected}`);
            
            if (connected) {
                const wasConnected = window.robotConnections.connected.has(name);
                window.robotConnections.connected.add(name);
                console.log(`${name} is now connected`);

                // If this is a new connection and websocket is connected, send the app data
                if (!wasConnected && window.robotConnections.websockets[name]) {
                    console.log(`Sending initial app data to ${name}`);
                    this.sendAppData(name);
                }
            } else {
                window.robotConnections.connected.delete(name);
                console.log(`${name} is disconnected`);
            }
            this.updateConnectionDisplay();
        } catch (error) {
            console.error(`Failed to connect to ${name}:`, error);
            window.robotConnections.connected.delete(name);
            this.updateConnectionDisplay();
        }
    }

    // static sendAppData(robotName) {
    //     const ws = window.robotConnections.websockets[robotName];
    //     if (!ws || ws.readyState !== WebSocket.OPEN) {
    //         console.error(`WebSocket is not connected for ${robotName}`);
    //         return;
    //     }
        
    //     const message = {
    //         type: 'update_app_data',
    //         data: window.appData
    //     };
        
    //     ws.send(JSON.stringify(message));
    // }

    static updateConnectionDisplay() {
        const statusText = document.querySelector('.status-text');
        const statusDot = document.querySelector('.status-dot');
        const connectedCount = window.robotConnections.connected.size;
        const websocketCount = Object.keys(window.robotConnections.websockets).length;
        const totalRobots = Object.keys(window.robotConnections.profiles).length;

        console.log(`Updating display: ${connectedCount}/${totalRobots} robots connected, ${websocketCount} websockets active`);

        // Update status text
        if (totalRobots === 0) {
            statusText.textContent = 'No robots configured';
            statusDot.className = 'status-dot'; // Red dot
        } else {
            statusText.textContent = `${connectedCount}/${totalRobots} robots connected (${websocketCount} websockets)`;
            
            // Update dot color based on connection status
            if (connectedCount === 0) {
                statusDot.className = 'status-dot'; // Red dot
            } else if (connectedCount === totalRobots && websocketCount === totalRobots) {
                statusDot.className = 'status-dot connected'; // Green dot
            } else {
                statusDot.className = 'status-dot partial'; // Yellow dot
            }
        }

        // Update dropdown
        const robotList = document.querySelector('.robot-list');
        robotList.innerHTML = '';

        Object.entries(window.robotConnections.profiles).forEach(([name, profile]) => {
            const isConnected = window.robotConnections.connected.has(name);
            const hasWebSocket = !!window.robotConnections.websockets[name];
            console.log(`Creating dropdown entry for ${name} (connected: ${isConnected}, websocket: ${hasWebSocket})`);
            
            const robotElement = document.createElement('div');
            robotElement.className = 'connection-option';
            robotElement.innerHTML = `
                <span class="status-dot ${isConnected ? 'connected' : ''}"></span>
                <span>${name}</span>
                ${hasWebSocket ? '<span class="ws-indicator">WS</span>' : ''}
            `;
            robotList.appendChild(robotElement);
        });

        // Update active hostnames
        let connectedRobotNames = Array.from(window.robotConnections.connected);
        const robotProfiles = window.appData.sshProfiles.profiles;
        const robotNames = robotProfiles.map(profile => profile.name);
        const sortedConnectedRobotNames = connectedRobotNames.sort((a, b) => {
            return robotNames.indexOf(a) - robotNames.indexOf(b);
        });

        let hostnames = sortedConnectedRobotNames.map(robotName => 
            window.robotConnections.profiles[robotName].hostname
        );

        window.activeHostnames = hostnames;

        // Dispatch custom event for connection changes
        document.dispatchEvent(new CustomEvent('connectionsChanged', {
            detail: {
                connected: Array.from(window.robotConnections.connected),
                websockets: Object.keys(window.robotConnections.websockets),
                total: Object.keys(window.robotConnections.profiles).length
            }
        }));
    }

    static setupEventListeners() {
        // Auto-refresh connections periodically (every 30 seconds)
        setInterval(() => {
            Object.entries(window.robotConnections.profiles).forEach(([name, profile]) => {
                this.tryConnect(name, profile);
            });
        }, 30000);
    }

    static sendAppData(robotName) {
        // If no specific robot name is provided, send to all connected websockets
        if (!robotName) {
            Object.entries(window.robotConnections.websockets).forEach(([name, ws]) => {
                if (ws.readyState === WebSocket.OPEN) {
                    const message = {
                        type: 'update_app_data',
                        data: window.appData
                    };
                    ws.send(JSON.stringify(message));
                    console.log(`Sent app data to ${name}`);
                } else {
                    console.error(`WebSocket is not connected for ${name}`);
                }
            });
            return;
        }

        // Send to specific robot if name is provided
        const ws = window.robotConnections.websockets[robotName];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket is not connected for ${robotName}`);
            return;
        }
        
        const message = {
            type: 'update_app_data',
            data: window.appData
        };
        
        ws.send(JSON.stringify(message));
        console.log(`Sent app data to ${robotName}`);
    }

    static sendRemoteControlCommand(direction, speed, rotation, robotName = null) {
        const message = {
            type: 'drive',
            angle: direction,
            speed: speed,
            rotation: rotation
        };

        // If no specific robot name is provided, send to all connected websockets
        if (!robotName) {
            Object.entries(window.robotConnections.websockets).forEach(([name, ws]) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                    console.log(`Sent drive command to ${name}: angle=${direction}, speed=${speed}, rotation=${rotation}`);
                } else {
                    console.error(`WebSocket is not connected for ${name}`);
                }
            });
            return;
        }

        // Send to specific robot if name is provided
        const ws = window.robotConnections.websockets[robotName];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket is not connected for ${robotName}`);
            return;
        }
        
        ws.send(JSON.stringify(message));
        console.log(`Sent drive command to ${robotName}: angle=${direction}, speed=${speed}, rotation=${rotation}`);
    }

    static sendEmergencyStop(robotName = null) {
        const message = {
            type: 'stop'
        };

        // If no specific robot name is provided, send to all connected websockets
        if (!robotName) {
            Object.entries(window.robotConnections.websockets).forEach(([name, ws]) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                    console.log(`Sent emergency stop to ${name}`);
                } else {
                    console.error(`WebSocket is not connected for ${name}`);
                }
            });
            return;
        }

        // Send to specific robot if name is provided
        const ws = window.robotConnections.websockets[robotName];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket is not connected for ${robotName}`);
            return;
        }
        
        ws.send(JSON.stringify(message));
        console.log(`Sent emergency stop to ${robotName}`);
    }

    static sendKickCommand(robotName = null) {
        const message = {
            type: 'kick'
        };

        // If no specific robot name is provided, send to all connected websockets
        if (!robotName) {
            Object.entries(window.robotConnections.websockets).forEach(([name, ws]) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                    console.log(`Sent kick command to ${name}`);
                } else {
                    console.error(`WebSocket is not connected for ${name}`);
                }
            });
            return;
        }

        // Send to specific robot if name is provided
        const ws = window.robotConnections.websockets[robotName];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket is not connected for ${robotName}`);
            return;
        }
        
        ws.send(JSON.stringify(message));
        console.log(`Sent kick command to ${robotName}`);
    }

    static sendDribblerCommand(robotName = null) {
        const message = {
            type: 'dribbler'
        };

        // If no specific robot name is provided, send to all connected websockets
        if (!robotName) {
            Object.entries(window.robotConnections.websockets).forEach(([name, ws]) => {
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                    console.log(`Sent dribbler toggle to ${name}`);
                } else {
                    console.error(`WebSocket is not connected for ${name}`);
                }
            });
            return;
        }

        // Send to specific robot if name is provided
        const ws = window.robotConnections.websockets[robotName];
        if (!ws || ws.readyState !== WebSocket.OPEN) {
            console.error(`WebSocket is not connected for ${robotName}`);
            return;
        }
        
        ws.send(JSON.stringify(message));
        console.log(`Sent dribbler toggle to ${robotName}`);
    }

}

function setupConnectionDropdown() {
    const connectionStatus = document.querySelector('.connection-status');
    const dropdown = document.querySelector('.connection-dropdown');
    const robotList = document.querySelector('.robot-list');

    // Toggle dropdown visibility
    connectionStatus.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = dropdown.classList.contains('show');
        
        if (isVisible) {
            dropdown.classList.remove('show');
        } else {
            dropdown.classList.add('show');
            // Refresh connections when opening the dropdown
            Object.entries(window.robotConnections.profiles).forEach(([name, profile]) => {
                RobotManager.tryConnect(name, profile);
            });
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
        dropdown.classList.remove('show');
    });

    // Prevent dropdown from closing when clicking inside it
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Add click handler for robot items
    robotList.addEventListener('click', (e) => {
        const robotItem = e.target.closest('.connection-option');
        if (robotItem) {
            // Add animation class
            robotItem.classList.add('rippling');
            // Remove class after animation completes
            setTimeout(() => {
                robotItem.classList.remove('rippling');
            }, 800); // Match animation duration

            Object.entries(window.robotConnections.profiles).forEach(([name, profile]) => {
                RobotManager.tryConnect(name, profile);
            });
        }
    });
}

// Initialize when the document is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing RobotManager');
    RobotManager.initializeConnections();
    RobotManager.setupEventListeners();
    setupConnectionDropdown();
}); 

window.RobotManager = RobotManager;


window.sendAppData = () => RobotManager.sendAppData();

// Expose remote control functions globally
window.sendRemoteControlCommand = (direction, speed, rotation, robotName) => 
    RobotManager.sendRemoteControlCommand(direction, speed, rotation, robotName);

window.sendEmergencyStop = (robotName) => 
    RobotManager.sendEmergencyStop(robotName);


window.sendKickCommand = (robotName) => RobotManager.sendKickCommand(robotName);

window.sendDribblerCommand = (robotName) => RobotManager.sendDribblerCommand(robotName);