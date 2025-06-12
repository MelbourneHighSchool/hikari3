appRegistry.register('remote', {
    title: 'Manual Drive',
    icon: 'gamepad',
    template: `
        <style>
            .speed-control {
                margin: 2rem auto;
                max-width: 300px;
                text-align: center;
            }
            
            .speed-slider {
                width: 100%;
                margin: 1rem 0;
            }
            
            .speed-value {
                font-size: 1.2rem;
                color: var(--accent-color);
            }
            
            .status {
                text-align: center;
                margin-top: 1rem;
                color: var(--foreground);
                opacity: 0.8;
            }

            .toggle-controls {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                margin: 1rem auto;
                padding: 0.5rem;
                background: rgba(var(--accent-rgb), 0.1);
                border-radius: 8px;
                cursor: pointer;
                max-width: 300px;
            }

            .toggle-controls.active {
                background: rgba(var(--accent-rgb), 0.3);
            }

            .robot-selector {
                margin: 1rem auto;
                max-width: 300px;
            }
            .robot-selector select {
                width: 100%;
                padding: 0.5rem;
                background: rgba(var(--card-bg-rgb), 0.3);
                border: none;
                border-radius: 4px;
                color: var(--foreground);
            }
            .robot-selector .all-robots {
                opacity: 0.7;
                font-style: italic;
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">gamepad</span>
                        <h3>Manual Drive</h3>
                    </div>
                    
                    <div class="toggle-controls">
                        <span class="material-icons">keyboard</span>
                        <span class="toggle-text">Enable Keyboard Controls</span>
                    </div>

                    <div class="speed-control">
                        <div>Speed Control (W/Q to adjust)</div>
                        <input type="range" class="speed-slider" min="0" max="100" value="1">
                        <div class="speed-value">1%</div>
                    </div>
                    
                    <div class="status">
                        Ready to control
                    </div>
                </div>
            </div>
        </div>
    `,
    setup: function() {
        const speedSlider = document.querySelector('.speed-slider');
        const speedValue = document.querySelector('.speed-value');
        const status = document.querySelector('.status');
        const toggleControls = document.querySelector('.toggle-controls');
        const toggleText = document.querySelector('.toggle-text');
        
        let currentSpeed = 1;
        let controlsEnabled = false;
        let pressedKeys = new Set();
        let dribblerActive = false;

        let rotation = 0
        
        function updateSpeedDisplay() {
            speedSlider.value = currentSpeed;
            speedValue.textContent = `${currentSpeed} RPS  rot ${rotation}`;
        }

        function adjustSpeed(delta) {
            currentSpeed = Math.max(0, Math.min(100, currentSpeed + delta));
            updateSpeedDisplay();
            
            // Update movement if keys are pressed
            if (pressedKeys.size > 0) {
                const { angle, direction } = getMovementFromKeys();
                if (angle !== null) {
                    sendCommand(angle, currentSpeed, rotation);
                    updateStatusDisplay(`Moving ${angle}° at ${currentSpeed} RPS rot ${rotation}`);
                }
            }
        }
        
        // Toggle keyboard controls
        toggleControls.addEventListener('click', () => {
            controlsEnabled = !controlsEnabled;
            toggleControls.classList.toggle('active');
            toggleText.textContent = controlsEnabled ? 'Disable Keyboard Controls' : 'Enable Keyboard Controls';
            updateStatusDisplay(controlsEnabled ? 'Controls enabled - Ready' : 'Controls disabled');
            console.log('Keyboard controls:', controlsEnabled ? 'enabled' : 'disabled');
            
            if (controlsEnabled) {
                sendCommand("manual", "enable", 0);
            } else {
                sendCommand("manual", "disable", 0)
            }

            if (!controlsEnabled) {
                pressedKeys.clear();
                sendCommand(0, 0, 0);
            }
        });
        
        // Update speed value display
        speedSlider.addEventListener('input', (e) => {
            currentSpeed = parseInt(e.target.value);
            speedValue.textContent = `${currentSpeed} RPS  rot ${rotation}`;
        });

        function getMovementFromKeys() {
            // Priority: Up/Down first, then Left/Right
            let angle = null;
            let direction = '';

            if (pressedKeys.has('ArrowUp')) {
                angle = 0;
                direction = 'forward';
                if (pressedKeys.has('ArrowLeft')) {
                    angle = 315;
                    direction = 'forward-left';
                } else if (pressedKeys.has('ArrowRight')) {
                    angle = 45;
                    direction = 'forward-right';
                }
            } else if (pressedKeys.has('ArrowDown')) {
                angle = 180;
                direction = 'backward';
                if (pressedKeys.has('ArrowLeft')) {
                    angle = 225;
                    direction = 'backward-left';
                } else if (pressedKeys.has('ArrowRight')) {
                    angle = 135;
                    direction = 'backward-right';
                }
            } else if (pressedKeys.has('ArrowLeft')) {
                angle = 270;
                direction = 'left';
            } else if (pressedKeys.has('ArrowRight')) {
                angle = 90;
                direction = 'right';
            }; if (pressedKeys.has('a')) {
                rotation = currentSpeed * -0.5
            }; if (pressedKeys.has('d')) {
                rotation = currentSpeed * 0.5
            }
            console.log(rotation)

            if(!pressedKeys.has('a') && !pressedKeys.has('d')) {
                rotation = 0;
            }

            return { angle, direction, rotation };
        }
        
        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (!controlsEnabled) {
                console.log('Controls disabled, ignoring key press');
                return;
            }
            
            switch(e.key.toLowerCase()) {
                case 'w':
                    adjustSpeed(0.25);
                    console.log('Speed increased to', currentSpeed);
                    break;
                case 'q':
                    adjustSpeed(-0.25);
                    console.log('Speed decreased to', currentSpeed);
                    break;
                case 'e':  // Toggle dribbler
                    e.preventDefault();
                    selectedRobot = robotSelect.value || null;
                    if (window.robotConnections.websockets[selectedRobot] || !selectedRobot) {
                        window.sendDribblerCommand(selectedRobot);
                        dribblerActive = !dribblerActive;
                        updateStatusDisplay(dribblerActive ? 'Dribbler activated' : 'Dribbler deactivated');
                    }
                    break;
                case ' ':  // Spacebar
                    e.preventDefault(); // Prevent page scrolling
                    selectedRobot = robotSelect.value || null;
                    if (window.robotConnections.websockets[selectedRobot] || !selectedRobot) {
                        window.sendKickCommand(selectedRobot);
                        updateStatusDisplay('Kicking!');
                        setTimeout(() => {
                            if (status.textContent === 'Kicking!') {
                                updateStatusDisplay('Ready');
                            }
                        }, 500);
                    }
                    break;
                default:
                    if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'a', 'd'].includes(e.key)) {
                        pressedKeys.add(e.key);
                        const { angle, direction, rotation } = getMovementFromKeys();
                        updateSpeedDisplay()
                        
                        if (angle !== null) {
                            console.log(`Moving ${direction} (${angle}°) at ${currentSpeed}% speed`);
                            sendCommand(angle, currentSpeed, rotation);
                            updateStatusDisplay(`Moving ${angle}° at ${currentSpeed} RPS rot ${rotation}`);
                        } else {
                            sendCommand(0, 0, rotation)
                        }
                    }
            }
        });

        // Stop movement when key is released
        document.addEventListener('keyup', (e) => {
            console.log(e)
            if (!controlsEnabled) return;
            
            if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'a', 'd'].includes(e.key)) {
                pressedKeys.delete(e.key);
                
                if (pressedKeys.size === 0) {
                    console.log('Stopped movement - all keys released');
                    sendCommand(0, 0, 0);
                    updateStatusDisplay('Stopped');
                } else {
                    const { angle, direction, rotation } = getMovementFromKeys();
                    updateSpeedDisplay();
                    if (angle !== null) {
                        console.log(`Moving ${direction} (${angle}°) at ${currentSpeed}% speed`);
                        sendCommand(angle, currentSpeed, rotation);
                        updateStatusDisplay(`Moving ${angle}° at ${currentSpeed} RPS rot ${rotation}`);
                    } else {
                        sendCommand(0, 0, rotation)
                    }
                }
            }
        });

        // Add robot selector
        const robotSelector = document.createElement('div');
        robotSelector.className = 'robot-selector';
        robotSelector.innerHTML = `
            <style>
                .robot-selector {
                    margin: 1rem auto;
                    max-width: 300px;
                }
                .robot-selector select {
                    width: 100%;
                    padding: 0.5rem;
                    background: rgba(var(--card-bg-rgb), 0.3);
                    border: none;
                    border-radius: 4px;
                    color: var(--foreground);
                }
                .robot-selector .all-robots {
                    opacity: 0.7;
                    font-style: italic;
                }
            </style>
            <select>
                <option value="" class="all-robots">All Connected Robots</option>
            </select>
        `;
        
        document.querySelector('.speed-control').before(robotSelector);
        const robotSelect = robotSelector.querySelector('select');

        // Update robot list when connections change
        document.addEventListener('connectionsChanged', (event) => {
            const websockets = event.detail.websockets;
            const currentValue = robotSelect.value;
            
            // Rebuild options
            robotSelect.innerHTML = '<option value="" class="all-robots">All Connected Robots</option>';
            websockets.forEach(name => {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name;
                robotSelect.appendChild(option);
            });
            
            // Try to restore previous selection
            if (currentValue && websockets.includes(currentValue)) {
                robotSelect.value = currentValue;
            }
        });

        // Modify existing sendRemoteControlCommand calls to include robot selection
        function sendCommand(angle, speed, rotation) {
            const selectedRobot = robotSelect.value || null; // null means all robots
            window.sendRemoteControlCommand(angle, speed, rotation, selectedRobot);
        }

        // Initialize speed display
        updateSpeedDisplay();

        // Add dribbler status to the status display function
        function updateStatusDisplay(message) {
            status.textContent = message;
            if (dribblerActive) {
                status.textContent += ' (Dribbler ON)';
            }
        }
    }
}); 