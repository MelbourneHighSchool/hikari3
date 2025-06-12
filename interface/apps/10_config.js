appRegistry.register('config', {
    title: 'Robot Configuration',
    icon: 'settings',
    template: `
        <style>
            .profile-item {
                position: relative;
                padding-right: 2rem !important;  /* Space for delete button */
                cursor: pointer;
                user-select: none;
            }
            
            /* Override padding for new profile button */
            .profile-item.new-profile {
                padding-right: 0.75rem !important;  /* Reset to normal padding */
            }
            
            .delete-container {
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 2rem;  /* Width of the hover area */
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1;
            }
            
            .delete-profile {
                position: absolute;
                font-size: 1rem !important;
                opacity: 0;
                transition: opacity 0.2s ease;
                cursor: pointer;
                color: var(--foreground);
                visibility: hidden;
            }
            
            .delete-container:hover .delete-profile {
                opacity: 0.5;
                visibility: visible;
            }
            
            .delete-profile:hover {
                opacity: 1 !important;
            }
            
            /* Don't show delete button on new profile button */
            .new-profile .delete-container {
                display: none;
            }

            /* Add styles for drag and drop */
            .profile-item.dragging {
                opacity: 0.5;
                cursor: pointer;
            }

            .profile-item.drag-over {
                border-top: 2px solid var(--accent);
            }

            /* Configuration tabs styling */
            .config-type-btn {
                flex: 1;
                background: rgba(26,24,38,0.2);
                border: none;
                outline: none;
                color: var(--foreground);
                padding: 0.25rem 0.5rem;
                border-radius: 0.25rem;
                font-family: inherit;
                font-size: 0.75rem;
                transition: all 0.2s ease;
                cursor: pointer;
            }

            .config-type-btn.selected-type {
                background: rgba(var(--accent-rgb), 0.15);
            }

            /* Section headers */
            .section-header {
                font-size: 0.75rem;
                opacity: 0.5;
                margin-bottom: 0.15rem;
                margin-top: 0.7rem;
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">settings</span>
                        <h3>Robot Profiles</h3>
                    </div>
                    <div class="profile-list pointer-enabled" id="profile-list">
                        <!-- Profiles will be inserted here dynamically -->
                        <button class="profile-item new-profile pointer-enabled">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                </div>
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">settings</span>
                        <h3>Robot Settings</h3>
                    </div>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div class="input-row">
                            <label>Robot Name</label>
                            <input type="text" id="profile-name" placeholder="Enter robot name">
                        </div>

                        <div class="section-header">Configuration</div>
                        <div style="display: flex; flex: 1; gap: 0.5rem;">
                            <button class="config-type-btn selected-type" data-type="ssh"
                                style="flex: 1;">SSH</button>
                            <button class="config-type-btn" data-type="motors"
                                style="flex: 1;">Motors</button>
                            <button class="config-type-btn" data-type="camera"
                                style="flex: 1;">Camera</button>
                            <button class="config-type-btn" data-type="other"
                                style="flex: 1;">Other</button>
                        </div>

                        <div id="config-ssh-settings" style="display: block;">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <div class="input-row">
                                    <label>Hostname</label>
                                    <input type="text" id="profile-hostname" placeholder="robot.example.com">
                                </div>
                                <div class="input-row">
                                    <label>Username</label>
                                    <input type="text" id="profile-username" placeholder="robot">
                                </div>
                                <div class="input-row">
                                    <label>Identity File</label>
                                    <input type="file" 
                                        id="identity-file" 
                                        style="display: none">
                                    <input type="text" 
                                        id="identity-filename" 
                                        placeholder="Click to select identity file"
                                        readonly
                                        style="cursor: pointer;">
                                </div>
                            </div>
                        </div>
                        

                        <div id="config-motors-settings" style="display: none;">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="min-width: 2.9rem">Motor 1</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <select style="width: 3.6rem; flex: 0 0 auto; background: rgba(var(--card-bg-rgb), 0.2); border: none; outline: none; color: var(--foreground); border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-family: inherit; font-size: 0.75rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; cursor: pointer;">
                                            <option value="M3508">M3508</option>
                                            <option value="M2006">M2006</option>
                                        </select>
                                        <input type="text" placeholder="i2c" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="angle" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="pole" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="amps" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="calibration" style="width: 2rem; ">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="min-width: 2.9rem">Motor 2</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <select style="width: 3.6rem; flex: 0 0 auto; background: rgba(var(--card-bg-rgb), 0.2); border: none; outline: none; color: var(--foreground); border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-family: inherit; font-size: 0.75rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; cursor: pointer;">
                                            <option value="M3508">M3508</option>
                                            <option value="M2006">M2006</option>
                                        </select>
                                        <input type="text" placeholder="i2c" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="angle" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="pole" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="amps" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="calibration" style="width: 2rem; ">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="min-width: 2.9rem">Motor 3</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <select style="width: 3.6rem; flex: 0 0 auto; background: rgba(var(--card-bg-rgb), 0.2); border: none; outline: none; color: var(--foreground); border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-family: inherit; font-size: 0.75rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; cursor: pointer;">
                                            <option value="M3508">M3508</option>
                                            <option value="M2006">M2006</option>
                                        </select>
                                        <input type="text" placeholder="i2c" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="angle" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="pole" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="amps" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="calibration" style="width: 2rem; ">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="min-width: 2.9rem">Motor 4</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <select style="width: 3.6rem; flex: 0 0 auto; background: rgba(var(--card-bg-rgb), 0.2); border: none; outline: none; color: var(--foreground); border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-family: inherit; font-size: 0.75rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; cursor: pointer;">
                                            <option value="M3508">M3508</option>
                                            <option value="M2006">M2006</option>
                                        </select>
                                        <input type="text" placeholder="i2c" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="angle" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="pole" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="amps" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="calibration" style="width: 2rem; ">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="min-width: 2.9rem">Motor D</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <select style="width: 3.6rem; flex: 0 0 auto; background: rgba(var(--card-bg-rgb), 0.2); border: none; outline: none; color: var(--foreground); border-radius: 0.25rem; padding: 0.25rem 0.5rem; font-family: inherit; font-size: 0.75rem; appearance: none; -webkit-appearance: none; -moz-appearance: none; cursor: pointer;">
                                            <option value="M3508">M3508</option>
                                            <option value="M2006">M2006</option>
                                        </select>
                                        <input type="text" placeholder="i2c" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="angle" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="pole" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="number" placeholder="amps" style="width: 2rem; flex: 0 0 auto;">
                                        <input type="text" placeholder="calibration" style="width: 2rem; ">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="config-camera-settings" style="display: none;">
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="">Camera Centre</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <input id="cameracentrex" type="number" placeholder="x" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="cameracentrey" type="number" placeholder="y" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="cameraforwardangle" type="number" placeholder="angle" style="width: 1.5rem; flex: 0 0 auto;">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="">Mask Radius</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <input id="maskradiusinner" type="number" placeholder="px" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="maskradiusouter" type="number" placeholder="px" style="width: 1.5rem; flex: 0 0 auto;">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="">Capture Zone</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <input id="capturezonex1" type="number" placeholder="x1" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="capturezoney1" type="number" placeholder="y1" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="capturezonex2" type="number" placeholder="x2" style="width: 1.5rem; flex: 0 0 auto;">
                                        <input id="capturezoney2" type="number" placeholder="y2" style="width: 1.5rem; flex: 0 0 auto;">
                                    </div>
                                </div>
                                <div class="input-row" style="display: flex; flex-direction: row; width: 100%;">
                                    <label style="">Robot Line Boundary</label>
                                    <div style="display: flex; gap: 0.5rem; flex: 1; width: 100%">
                                        <input id="robotlineboundary" type="number" placeholder="px" style="width: 1.5rem; flex: 0 0 auto;">
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div id="config-other-settings" style="display: none;">
                            <div class="input-row">
                                <label>Acceleration Limit</label>
                                <input type="number" placeholder="ms^-2">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,

    setup() {
        // Initialize sshProfiles if it doesn't exist
        if (!window.appData.sshProfiles) {
            window.appData.sshProfiles = {
                currentlySelected: "",
                profiles: []
            };
        }
        
        const profileData = window.appData.sshProfiles;
        const profileList = document.getElementById('profile-list');
        const newProfileBtn = profileList.querySelector('.new-profile');

        // Function to load profiles into the list
        function loadProfiles() {
            // Clear existing profile buttons (except the "new" button)
            const buttons = profileList.querySelectorAll('.profile-item:not(.new-profile)');
            buttons.forEach(btn => btn.remove());

            // Add profile buttons
            profileData.profiles.forEach(profile => {
                const profileBtn = document.createElement('button');
                profileBtn.className = 'profile-item pointer-enabled';
                if (profile.name === profileData.currentlySelected) {
                    profileBtn.classList.add('selected-profile');
                }
                
                // Create container for profile name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = profile.name;
                
                // Create delete container and button
                const deleteContainer = document.createElement('div');
                deleteContainer.className = 'delete-container';
                
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'material-icons delete-profile';
                deleteBtn.textContent = 'close';
                deleteBtn.title = 'Delete profile';
                
                deleteContainer.appendChild(deleteBtn);
                profileBtn.appendChild(nameSpan);
                profileBtn.appendChild(deleteContainer);
                profileBtn.dataset.profileName = profile.name;

                // Add drag and drop handlers
                profileBtn.draggable = true;
                
                profileBtn.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    profileBtn.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', profile.name);
                });

                profileBtn.addEventListener('dragend', () => {
                    profileBtn.classList.remove('dragging');
                    document.querySelectorAll('.profile-item').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                });

                profileBtn.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!e.currentTarget.classList.contains('new-profile')) {
                        e.currentTarget.classList.add('drag-over');
                    }
                });

                profileBtn.addEventListener('dragleave', (e) => {
                    e.currentTarget.classList.remove('drag-over');
                });

                profileBtn.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const draggedProfileName = e.dataTransfer.getData('text/plain');
                    const dropTargetName = e.currentTarget.dataset.profileName;
                    
                    if (draggedProfileName === dropTargetName) return;
                    
                    // Find indices
                    const draggedIndex = profileData.profiles.findIndex(t => t.name === draggedProfileName);
                    const dropIndex = profileData.profiles.findIndex(t => t.name === dropTargetName);
                    
                    if (draggedIndex !== -1 && dropIndex !== -1) {
                        // Reorder array
                        const [draggedProfile] = profileData.profiles.splice(draggedIndex, 1);
                        profileData.profiles.splice(dropIndex, 0, draggedProfile);
                        
                        // Refresh the list
                        loadProfiles();
                    }
                });
                
                // Add delete handler
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const profileIndex = profileData.profiles.findIndex(t => t.name === profile.name);
                    profileData.profiles.splice(profileIndex, 1);
                    
                    if (profile.name === profileData.currentlySelected) {
                        const newProfile = profileData.profiles[Math.max(0, profileIndex - 1)];
                        profileData.currentlySelected = newProfile ? newProfile.name : '';
                        if (newProfile) {
                            loadProfileSettings(newProfile.name);
                        }
                    }
                    
                    loadProfiles();
                });
                
                profileList.insertBefore(profileBtn, newProfileBtn);
            });
        }

        // Function to save profile changes
        function saveProfileChanges() {
            console.log('saving profile')

            const currentProfile = profileData.profiles.find(p => p.name === profileData.currentlySelected);
            if (!currentProfile) return;

            // Save motor settings
            currentProfile.motors = {
                motor1: {
                    type: document.querySelector('#config-motors-settings .input-row:nth-child(1) select').value,
                    i2c: document.querySelector('#config-motors-settings .input-row:nth-child(1) input[placeholder="i2c"]').value,
                    angle: document.querySelector('#config-motors-settings .input-row:nth-child(1) input[placeholder="angle"]').value,
                    pole: document.querySelector('#config-motors-settings .input-row:nth-child(1) input[placeholder="pole"]').value,
                    amps: document.querySelector('#config-motors-settings .input-row:nth-child(1) input[placeholder="amps"]').value,
                    calibration: document.querySelector('#config-motors-settings .input-row:nth-child(1) input[placeholder="calibration"]').value
                },
                motor2: {
                    type: document.querySelector('#config-motors-settings .input-row:nth-child(2) select').value,
                    i2c: document.querySelector('#config-motors-settings .input-row:nth-child(2) input[placeholder="i2c"]').value,
                    angle: document.querySelector('#config-motors-settings .input-row:nth-child(2) input[placeholder="angle"]').value,
                    pole: document.querySelector('#config-motors-settings .input-row:nth-child(2) input[placeholder="pole"]').value,
                    amps: document.querySelector('#config-motors-settings .input-row:nth-child(2) input[placeholder="amps"]').value,
                    calibration: document.querySelector('#config-motors-settings .input-row:nth-child(2) input[placeholder="calibration"]').value
                },
                motor3: {
                    type: document.querySelector('#config-motors-settings .input-row:nth-child(3) select').value,
                    i2c: document.querySelector('#config-motors-settings .input-row:nth-child(3) input[placeholder="i2c"]').value,
                    angle: document.querySelector('#config-motors-settings .input-row:nth-child(3) input[placeholder="angle"]').value,
                    pole: document.querySelector('#config-motors-settings .input-row:nth-child(3) input[placeholder="pole"]').value,
                    amps: document.querySelector('#config-motors-settings .input-row:nth-child(3) input[placeholder="amps"]').value,
                    calibration: document.querySelector('#config-motors-settings .input-row:nth-child(3) input[placeholder="calibration"]').value
                },
                motor4: {
                    type: document.querySelector('#config-motors-settings .input-row:nth-child(4) select').value,
                    i2c: document.querySelector('#config-motors-settings .input-row:nth-child(4) input[placeholder="i2c"]').value,
                    angle: document.querySelector('#config-motors-settings .input-row:nth-child(4) input[placeholder="angle"]').value,
                    pole: document.querySelector('#config-motors-settings .input-row:nth-child(4) input[placeholder="pole"]').value,
                    amps: document.querySelector('#config-motors-settings .input-row:nth-child(4) input[placeholder="amps"]').value,
                    calibration: document.querySelector('#config-motors-settings .input-row:nth-child(4) input[placeholder="calibration"]').value
                },
                motorD: {
                    type: document.querySelector('#config-motors-settings .input-row:nth-child(5) select').value,
                    i2c: document.querySelector('#config-motors-settings .input-row:nth-child(5) input[placeholder="i2c"]').value,
                    angle: document.querySelector('#config-motors-settings .input-row:nth-child(5) input[placeholder="angle"]').value,
                    pole: document.querySelector('#config-motors-settings .input-row:nth-child(5) input[placeholder="pole"]').value,
                    amps: document.querySelector('#config-motors-settings .input-row:nth-child(5) input[placeholder="amps"]').value,
                    calibration: document.querySelector('#config-motors-settings .input-row:nth-child(5) input[placeholder="calibration"]').value
                }
            };

            currentProfile.camera = {
                centre: {
                    x: document.querySelector('#cameracentrex').value,
                    y: document.querySelector('#cameracentrey').value
                },

                forwardangle: document.querySelector('#cameraforwardangle').value,

                mask: {
                    inner: document.querySelector("#maskradiusinner").value,
                    outer: document.querySelector("#maskradiusouter").value
                }
            }
            
            currentProfile.capturezone = {
                x1: document.querySelector("#capturezonex1").value || 0,
                y1: document.querySelector("#capturezoney1").value || 0,
                x2: document.querySelector("#capturezonex2").value || 0,
                y2: document.querySelector("#capturezoney2").value || 0,
            }

            currentProfile.robotlineboundary = document.querySelector("#robotlineboundary").value || 0

            // Update window.appData
            const profileIndex = window.appData.sshProfiles.profiles.findIndex(
                p => p.name === profileData.currentlySelected
            );
            if (profileIndex !== -1) {
                window.appData.sshProfiles.profiles[profileIndex] = currentProfile;
                // Send updated data to backend
                window.sendAppData();
            }
        }

        // Function to load profile settings into the form
        function loadProfileSettings(profileName) {
            const profile = profileData.profiles.find(p => p.name === profileName);
            if (!profile) return;

            // Update inputs with profile values
            document.getElementById('profile-name').value = profile.name;
            document.getElementById('profile-hostname').value = profile.hostname;
            document.getElementById('profile-username').value = profile.username;
            document.getElementById('identity-filename').value = profile.identityFile || '';

            // Load motor settings if they exist
            if (profile.motors) {
                const motors = profile.motors;
                const motorRows = document.querySelectorAll('#config-motors-settings .input-row');
                
                motorRows.forEach((row, index) => {
                    const motorKey = `motor${index === 4 ? 'D' : index + 1}`;
                    const motorData = motors[motorKey];
                    
                    if (motorData) {
                        row.querySelector('select').value = motorData.type;
                        row.querySelector('input[placeholder="i2c"]').value = motorData.i2c;
                        row.querySelector('input[placeholder="angle"]').value = motorData.angle;
                        row.querySelector('input[placeholder="pole"]').value = motorData.pole;
                        row.querySelector('input[placeholder="amps"]').value = motorData.amps;
                        row.querySelector('input[placeholder="calibration"]').value = motorData.calibration;
                    }
                });
            }
            /*
                            currentProfile.camera = {
                centre: {
                    x: document.querySelector('#cameracentrex').value,
                    y: document.querySelector('#cameracentrey').value
                },

                forwardangle: document.querySelector('#cameraforwardangle').value,

                mask: {
                    inner: document.querySelector("#maskradiusinner").value,
                    outer: document.querySelector("#maskradiusouter").value
                }
            }
                */

            if (profile.camera) {
                document.querySelector('#cameracentrex').value = profile.camera.centre?.x || '';
                document.querySelector('#cameracentrey').value = profile.camera.centre?.y || '';
                document.querySelector('#cameraforwardangle').value = profile.camera.forwardangle || '';
                document.querySelector('#maskradiusinner').value = profile.camera.mask?.inner || '';
                document.querySelector('#maskradiusouter').value = profile.camera.mask?.outer || '';
            }

            // console.log(profile)

            if (profile.capturezone) {
                document.querySelector('#capturezonex1').value = profile.capturezone.x1 || '';
                document.querySelector('#capturezoney1').value = profile.capturezone.y1 || '';
                document.querySelector('#capturezonex2').value = profile.capturezone.x2 || '';
                document.querySelector('#capturezoney2').value = profile.capturezone.y2 || '';
            }

            if (profile.robotlineboundary) {
                document.querySelector("#robotlineboundary").value = profile.robotlineboundary || '10';
            }
        }

        // Add event listeners for motor inputs
        function setupMotorInputListeners() {
            const motorInputs = document.querySelectorAll('#config-motors-settings input, #config-motors-settings select');
            motorInputs.forEach(input => {
                input.addEventListener('input', saveProfileChanges);
            });
        }

        // Add motor input listeners
        setupMotorInputListeners();

        // Add event listeners for camera inputs
        function setupCameraInputListeners() {
            const cameraInputs = document.querySelectorAll('#config-camera-settings input');
            cameraInputs.forEach(input => {
                input.addEventListener('input', saveProfileChanges);
            });
        }

        // Add camera input listeners
        setupCameraInputListeners();

        // Event handler for profile selection
        profileList.addEventListener('click', (e) => {
            const profileItem = e.target.closest('.profile-item');
            if (!profileItem || profileItem.classList.contains('new-profile')) return;

            // Update selection in UI
            document.querySelectorAll('.profile-item').forEach(item => {
                item.classList.remove('selected-profile');
            });
            profileItem.classList.add('selected-profile');

            // Update current profile in data
            profileData.currentlySelected = profileItem.dataset.profileName;
            
            // Load profile settings
            loadProfileSettings(profileItem.dataset.profileName);
        });

        // Event handler for new profile button
        newProfileBtn.addEventListener('click', () => {
            const newProfile = {
                name: `Robot ${profileData.profiles.length + 1}`,
                hostname: '',
                username: '',
                identityFile: ''
            };

            profileData.profiles.push(newProfile);
            profileData.currentlySelected = newProfile.name;
            
            loadProfiles();
            loadProfileSettings(newProfile.name);
        });

        // Add event listeners for form inputs
        const inputs = {
            'profile-name': 'name',
            'profile-hostname': 'hostname',
            'profile-username': 'username'
        };

        Object.entries(inputs).forEach(([inputId, profileProperty]) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    saveProfileChanges({ [profileProperty]: e.target.value });
                    
                    // If name changed, reload the profile list
                    if (profileProperty === 'name') {
                        profileData.currentlySelected = e.target.value;
                        loadProfiles();
                    }
                });
            }
        });

        // Handle identity file upload
        const fileInput = document.querySelector('#identity-file');
        const filenameInput = document.querySelector('#identity-filename');
        
        if (filenameInput && fileInput) {
            filenameInput.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async () => {
                if (fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    
                    // Read file as data URL
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            // Save identity file through IPC
                            const filePath = await window.ipcRenderer.invoke('save-identity-file', {
                                fileData: e.target.result,
                                filename: file.name
                            });
                            
                            // Update UI and profile data
                            filenameInput.value = filePath;
                            saveProfileChanges({ 
                                identityFile: filePath
                            });
                        } catch (error) {
                            console.error('Failed to save identity file:', error);
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Add configuration tab handling
        const configBtns = document.querySelectorAll('.config-type-btn');
        if (configBtns.length) {
            configBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove selected class from all buttons
                    configBtns.forEach(b => {
                        b.classList.remove('selected-type');
                    });
                    
                    // Add selected class to clicked button
                    btn.classList.add('selected-type');

                    // Hide all settings first
                    document.querySelectorAll('#config-ssh-settings, #config-motors-settings, #config-camera-settings, #config-other-settings')
                        .forEach(el => el.style.display = 'none');

                    // Show the relevant settings
                    const selectedType = btn.dataset.type;
                    const settingsElement = document.querySelector(`#config-${selectedType}-settings`);
                    if (settingsElement) {
                        settingsElement.style.display = 'block';
                    }
                });
            });
        }

        // Initial load
        loadProfiles();
        if (profileData.currentlySelected) {
            loadProfileSettings(profileData.currentlySelected);
        }
    }
}); 