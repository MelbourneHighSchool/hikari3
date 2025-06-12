/**
 * Terminal Application
 * 
 * A web-based terminal interface that provides SSH access to connected robots.
 * Features include:
 * - Command history navigation with up/down arrows
 * - Support for Ctrl+C and Ctrl+D commands
 * - Robot selection dropdown for multiple connections
 * - Automatic prompt detection for both bash and Python shells
 * - Command output filtering to remove control sequences
 * - Clear command support
 * - Auto-scrolling output
 * 
 * The terminal provides real-time interaction with the robot's shell,
 * supporting both bash and Python REPL environments.
 */

appRegistry.register('terminal', {
    title: 'Terminal',
    icon: 'terminal',
    template: `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;500&display=swap');

            #terminal-interface {
                display: flex;
                flex-direction: column;
                height: 100%;
            }

            #terminal-container {
                background: rgba(var(--card-bg-rgb), 0.1);
                padding: 1rem;
                font-family: 'Roboto Mono', monospace;
                flex: 1;
                overflow: hidden;
                color: var(--foreground);
                margin-top: 1rem;
                border-radius: 4px;
                position: relative;
                display: flex;
                flex-direction: column;

                transition: background-color 0.2s ease, opacity 0.2s ease;
            }

            #terminal-output {
                flex: 1;
                overflow-y: scroll;
                margin-bottom: 0.5rem;
                scrollbar-width: none;  /* Firefox */
                -ms-overflow-style: none;  /* IE and Edge */
            }

            /* Webkit (Chrome, Safari, etc) */
            #terminal-output::-webkit-scrollbar {
                display: none;
            }

            #terminal-output .line {
                white-space: pre-wrap;
                word-wrap: break-word;
                line-height: 1.4;
                font-size: 14px;
                font-family: 'Roboto Mono', monospace;
                user-select: text;
                -webkit-user-select: text;
                -moz-user-select: text;
                -ms-user-select: text;
            }

            #terminal-input-line {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-family: 'Roboto Mono', monospace;
                font-size: 14px;
                flex-shrink: 0;  /* Prevent input from shrinking */
            }

            .delete-container {
                position: absolute;
                right: 0;
                top: 0;
                width: 2rem;
                height: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1;
            }
            
            .delete-theme {
                position: absolute;
                font-size: 1rem !important;
                opacity: 0;
                transition: opacity 0.2s ease;
                cursor: pointer;
                color: var(--foreground);
                visibility: hidden;
            }
            
            .delete-container:hover .delete-theme {
                opacity: 0.5;
                visibility: visible;
            }
            
            .delete-theme:hover {
                opacity: 1 !important;
            }

            #terminal-input {
                background: transparent;
                border: none;
                color: inherit;
                font-family: 'Roboto Mono', monospace;
                font-size: 14px;
                flex: 1;
                outline: none;
            }

            .prompt {
                color: var(--accent-color);
                font-family: 'Roboto Mono', monospace;
            }

            .error {
                color: #ff6b6b;
            }

            .command {
                color: #69db7c;
            }

            .success {
                color: #40c057;
            }

            .header-right {
                margin-left: auto;
                position: absolute;
                right: 0.75rem;
            }

            .robot-select-button {
                background: rgba(var(--card-bg-rgb), 0.2);
                border: none;
                outline: none;
                opacity: 0.8;
                color: var(--foreground);
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: inherit;
                font-size: 0.75rem;
                transition: all 0.2s ease;
                cursor: pointer;
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                width: 7rem;
                text-align: left;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                box-sizing: border-box;  /* Include padding in width */
            }

            .robot-select-button:hover {
                background: rgba(var(--accent-rgb), 0.15);
            }

            .robot-dropdown {
                position: absolute;
                top: calc(100% + 0.25rem);
                right: 0;
                background: transparent;
                backdrop-filter: blur(16px);
                -webkit-backdrop-filter: blur(16px);
                border-radius: 0.25rem;
                padding: 0.15rem 0;  /* Vertical padding only */
                width: 7rem;
                box-sizing: border-box;
                z-index: 2001;
                
                display: flex;
                flex-direction: column;
                gap: 0.2rem;  /* Increased from 0.15rem to 0.2rem */
                
                opacity: 0;
                transform: translateY(-10px);
                pointer-events: none;
                transition: all 0.2s ease-out;
            }

            .robot-dropdown.active {
                opacity: 1;
                transform: translateY(0);
                pointer-events: auto;
            }

            .robot-option {
                padding: 0.15rem 0.5rem;
                border-radius: 0.25rem;
                transition: all 0.2s ease;
                font-size: 0.75rem;
                background-color: rgba(var(--card-bg-rgb), 0.3);
                cursor: pointer;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                box-sizing: border-box;
            }

            .robot-option:hover {
                background: rgba(var(--accent-rgb), 0.15);
            }

            /* Add upload state styles */
            #terminal-container.uploading {
                background: rgba(var(--card-bg-rgb), 0) !important;  /* Make more transparent during upload */
                opacity: 0.8;
            }

            #terminal-container.uploading #terminal-input {
                opacity: 0.7;
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard" id="terminal-interface">
                    <div class="header-right">
                        <button class="robot-select-button">Select Robot...</button>
                        <div class="robot-dropdown">
                            <!-- Robot options will be inserted here -->
                        </div>
                    </div>

                    <div class="app-header">
                        <span class="material-icons">terminal</span>
                        <h3>Terminal</h3>
                    </div>
                    <div id="terminal-container">
                    
                        <div id="terminal-output"></div>
                        <div id="terminal-input-line">
                            <span class="prompt">$ </span>
                            <input type="text" id="terminal-input" autocomplete="off" autocorrect="off" spellcheck="false">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup: async function() {
        // DOM Elements
        const robotSelectBtn = document.querySelector('.robot-select-button');
        const robotDropdown = document.querySelector('.robot-dropdown');
        const terminalCard = document.querySelector('#terminal-interface');
        const terminalOutput = document.querySelector('#terminal-output');
        const terminalInput = document.querySelector('#terminal-input');
        
        // State
        let currentConnection = null;
        let commandHistory = [];
        let historyIndex = -1;
        let lastCommand = '';
        let lastPrompt = '';
        let currentRobot = null;
        
        // Initialize robot dropdown
        async function initializeRobotSelect() {
            robotDropdown.innerHTML = '';
            
            // Get connected robots from global state
            const connectedRobots = Array.from(window.robotConnections.connected);
            const profiles = window.robotConnections.profiles;
            
            // Create option for each connected robot
            connectedRobots.forEach(robotName => {
                const profile = profiles[robotName];
                if (!profile) return;

                const option = document.createElement('div');
                option.className = 'robot-option';
                option.dataset.name = robotName;
                option.textContent = robotName;
                
                // Highlight currently selected robot
                if (currentConnection && currentConnection.hostname === profile.hostname) {
                    option.style.background = 'rgba(var(--accent-rgb), 0.15)';
                }

                option.addEventListener('click', async () => {
                    robotSelectBtn.textContent = robotName;
                    robotDropdown.classList.remove('active');
                    
                    try {
                        await window.connectWithProfile(robotName);
                        currentConnection = profile;
                        terminalInput.focus();
                        appendToTerminal(`Connected to ${robotName}`, 'command');
                    } catch (error) {
                        appendToTerminal(`Failed to connect: ${error.message}`, 'error');
                        robotSelectBtn.textContent = 'Select Robot...';
                    }
                });

                robotDropdown.appendChild(option);
            });
        }
        
        // Toggle dropdown and refresh list
        robotSelectBtn.addEventListener('click', (e) => {
            // Refresh the dropdown content every time it's opened
            initializeRobotSelect();
            robotDropdown.classList.toggle('active');
            e.stopPropagation();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            robotDropdown.classList.remove('active');
        });
        
        // Terminal Output Handling
        function appendToTerminal(text, className = '') {
            const line = document.createElement('div');
            
            // Check for success/fail keywords and add appropriate class (case insensitive)
            const lowerText = text.toLowerCase();
            if (lowerText.includes('success')) {
                className += ' success';
            } else if (lowerText.includes('fail')) {
                className += ' error';
            }
            
            line.className = `line ${className}`;
            line.textContent = text;
            terminalOutput.appendChild(line);
            terminalOutput.scrollTop = terminalOutput.scrollHeight;
        }
        
        // Update the SSH data listener
        window.addEventListener('ssh-data-received', (event) => {
            if (event.detail.hostname === currentConnection?.hostname) {
                const text = String.fromCharCode(...event.detail.data);
                // Only filter specific control sequences while preserving content
                const cleanText = text
                    .replace(/\x1B\[[0-9;]*[A-Za-z]/g, '')    // ANSI escape sequences (colors, cursor movement)
                    .replace(/\x1B\][0-9];.*?\x07/g, '')      // OSC sequences
                    .replace(/\x1B\[\?[0-9;]*[A-Za-z]/g, '')  // DEC Private Mode sequences
                    .replace(/\x1B/g, '')                     // Bare ESC character
                    .replace(/\r\n/g, '\n')                   // Normalize line endings
                    .replace(/\r/g, '\n');                    // Convert remaining CR to LF

                if (cleanText.trim()) {  // Only process if there's actual content
                    // Split into lines and filter
                    const lines = cleanText.split('\n');
                    const filteredLines = lines.filter(line => {
                        const trimmedLine = line.trim();
                        // Skip if line is empty
                        if (!trimmedLine) return false;
                        // Skip if line is exactly the last command
                        if (trimmedLine === lastCommand) return false;
                        // Skip if line matches bash prompt pattern
                        if (trimmedLine.match(/^[\w-]+@[\w.-]+:[^\n\r$#]+[$#]\s*$/)) return false;
                        // Skip if line is Python prompt
                        if (trimmedLine === '>>>' || trimmedLine === '...') return false;
                        return true;
                    });

                    // Update where we process the filtered lines
                    if (filteredLines.length > 0) {
                        // Process each line separately instead of joining them
                        filteredLines.forEach(line => {
                            appendToTerminal(line);
                            requestAnimationFrame(() => {
                                terminalOutput.scrollTop = terminalOutput.scrollHeight;
                            });
                        });
                    }

                    // Move the scroll update outside the loop to avoid multiple reflows
                    requestAnimationFrame(() => {
                        terminalOutput.scrollTop = terminalOutput.scrollHeight;
                    });

                    // Update prompt - check for both bash and python prompts
                    updatePrompt(cleanText);
                }
            }
        });
        
        // Update prompt function to handle Python prompts
        function updatePrompt(text) {
            // Check for Python prompt first
            if (text.includes('>>>')) {
                const promptSpan = document.querySelector('.prompt');
                if (promptSpan) {
                    promptSpan.textContent = '>>> ';
                    lastPrompt = '>>> ';
                }
                return;
            }
            // Otherwise check for bash prompt
            const promptMatch = text.match(/[\n\r]?([\w-]+@[\w.-]+:[^\n\r$#]+[$#])\s*$/);
            if (promptMatch) {
                const promptText = promptMatch[1];
                lastPrompt = promptText + ' ';  // Store the prompt
                const promptSpan = document.querySelector('.prompt');
                if (promptSpan) {
                    promptSpan.textContent = lastPrompt;
                }
                return;
            }

            // otherwise, a program is running, so set the prompt to ... while it runs
            const promptSpan = document.querySelector('.prompt');
            if (promptSpan) {
                promptSpan.textContent = '... ';
            }
        }
        
        // Input Handling
        terminalInput.addEventListener('keydown', async (e) => {
            // Add Ctrl+C handling
            if (e.key === 'c' && e.ctrlKey) {
                e.preventDefault();
                if (!currentConnection) return;
                await window.sendSSHMessage(currentConnection.hostname, 'terminal', '\x03');
                appendToTerminal('^C');
                return;
            }
            
            // Add Ctrl+D handling
            if (e.key === 'd' && e.ctrlKey) {
                e.preventDefault();
                if (!currentConnection) return;
                if (terminalInput.value === '') {  // Only send EOF if input is empty
                    await window.sendSSHMessage(currentConnection.hostname, 'terminal', '\x04');
                    appendToTerminal('^D');
                }
                return;
            }

            if (e.key === 'Enter') {
                // Don't process commands if no robot is connected
                if (!currentConnection) {
                    e.preventDefault();
                    return;
                }

                const command = terminalInput.value;
                lastCommand = command;  // Store the command
                
                // Handle clear command locally
                if (command.trim() === 'clear') {
                    terminalOutput.innerHTML = '';
                    terminalInput.value = '';
                    return;
                }

                appendToTerminal('  '); // Add an extra line break before the command
                
                // Get the current prompt which contains username@hostname:workingdirectory
                const promptSpan = document.querySelector('.prompt');
                const currentPrompt = promptSpan ? promptSpan.textContent : '';
                appendToTerminal(`${currentPrompt} ${command}`, 'command');
                await window.sendSSHMessage(currentConnection.hostname, 'terminal', command + '\n');
                // remove any existing occurences of the command from the command history
                commandHistory = commandHistory.filter(cmd => cmd !== command);
                commandHistory.push(command);
                historyIndex = commandHistory.length;
                terminalInput.value = '';
            }
            // Update up/down arrow history navigation
            else if (e.key === 'ArrowUp') {
                if (historyIndex > 0) {
                    historyIndex--;
                    terminalInput.value = commandHistory[historyIndex];
                    // Move cursor to end
                    setTimeout(() => {
                        terminalInput.selectionStart = terminalInput.selectionEnd = terminalInput.value.length;
                    }, 0);
                }
            }
            else if (e.key === 'ArrowDown') {
                if (historyIndex < commandHistory.length - 1) {
                    historyIndex++;
                    terminalInput.value = commandHistory[historyIndex];
                    // Move cursor to end
                    setTimeout(() => {
                        terminalInput.selectionStart = terminalInput.selectionEnd = terminalInput.value.length;
                    }, 0);
                } else {
                    historyIndex = commandHistory.length;
                    terminalInput.value = '';
                }
            }
        });
        
        // Initialize
        await initializeRobotSelect();

        // Add upload state handlers
        window.addEventListener('core-upload-start', () => {
            document.querySelector('#terminal-container')?.classList.add('uploading');
        });

        window.addEventListener('core-upload-complete', () => {
            document.querySelector('#terminal-container')?.classList.remove('uploading');
        });

        window.addEventListener('core-upload-failed', () => {
            document.querySelector('#terminal-container')?.classList.remove('uploading');
        });
    }
}); 