appRegistry.register('vision', {
    title: 'Vision Calibration',
    icon: 'tune',
    template: `
        <style>
            .hsv-inputs {
                display: flex;
                gap: 0.5rem;
                align-items: center;
            }

            .hsv-inputs label {
                font-size: 0.75rem;
                font-weight: 500;  /* Make labels bold */
                opacity: 0.8;
                min-width: 4.5rem;
                white-space: nowrap;
            }

            .hsv-container {
                flex: 0 0 auto;
                display: flex;
                gap: 0.1rem;
                background: rgba(var(--card-bg-rgb), 0.3);
                border-radius: 4px;
                transition: all 0.2s ease;
                padding-left: 0.4rem;
                padding-right: 0.4rem;
            }

            .hsv-range-container {
                gap: 0.5rem;
                border-radius: 6px;
                width: 100%;
                display: flex;
            }

            .hsv-input {
                width: 1.5rem;
                background: transparent;
                border: none;
                color: var(--foreground);
                padding: 0.25rem 0;
                font-size: 0.75rem;
                font-family: inherit;
                outline: none;
                transition: all 0.2s ease;
                -moz-appearance: textfield;
                text-align: center;
            }

            .hsv-input::-webkit-outer-spin-button,
            .hsv-input::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }

            .hsv-container:hover {
                background: rgba(var(--card-bg-rgb), 0.4);
            }

            .hsv-container:focus-within {
                background: rgba(var(--card-bg-rgb), 0.5);
            }

            /* Add profile management styles */
            .vision-profile-item {
                position: relative;
                padding-right: 2rem !important;
                cursor: pointer;
                user-select: none;
            }
            
            .vision-profile-item.new-profile {
                padding-right: 0.75rem !important;
            }
            
            .vision-delete-container {
                position: absolute;
                right: 0;
                top: 0;
                bottom: 0;
                width: 2rem;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                z-index: 1;
            }
            
            .vision-delete-profile {
                position: absolute;
                font-size: 1rem !important;
                opacity: 0;
                transition: opacity 0.2s ease;
                cursor: pointer;
                color: var(--foreground);
                visibility: hidden;
            }
            
            .vision-delete-container:hover .vision-delete-profile {
                opacity: 0.5;
                visibility: visible;
            }
            
            .vision-delete-profile:hover {
                opacity: 1 !important;
            }
            
            .vision-profile-item.dragging {
                opacity: 0.5;
                cursor: pointer;
            }

            .vision-profile-item.drag-over {
                border-top: 2px solid var(--accent);
            }

            .hsv-log-btn {
                background-color: rgba(var(--card-bg-rgb), 0.2);
                border: none;
                padding: 0;
                height: 24px;  /* Match HSV input height */
                width: 24px;   /* Make it square */
                cursor: pointer;
                outline: inherit;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .hsv-log-btn.active {
                background-color: rgba(var(--foreground-rgb), 0.8);
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">tune</span>
                        <h3>Vision Profiles</h3>
                    </div>
                    <div class="profile-list pointer-enabled" id="vision-profile-list">
                        <!-- Profiles will be inserted here dynamically -->
                        <button class="vision-profile-item new-profile pointer-enabled">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                </div>
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">settings</span>
                        <h3>Profile Settings</h3>
                    </div>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div class="input-row">
                            <label>Profile Name</label>
                            <input type="text" id="vision-profile-name" placeholder="Enter profile name">
                        </div>

                        <div style="font-size: 0.75rem; opacity: 0.5; margin-bottom: 0.15rem; margin-top: 0.7rem;">Camera Settings</div>
                        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                            <div class="input-row">
                                <label>Exposure</label>
                                <input type="number" 
                                       id="camera-exposure" 
                                       min="0" 
                                       step="500"
                                       placeholder="10000">
                            </div>
                            <div class="input-row">
                                <label>Saturation</label>
                                <input type="number" 
                                       id="camera-saturation" 
                                       min="0"
                                       step="0.05"
                                       placeholder="1.0">
                            </div>
                        </div>

                        <div style="font-size: 0.75rem; opacity: 0.5; margin-bottom: 0.15rem; margin-top: 0.7rem;">HSV Ranges</div>
                        <div class="hsv-inputs">
                            <label>Orange Ball</label>
                            <div class="hsv-range-container" id="Ball">
                                <div class="hsv-container hsv-min" id="ball-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="ball-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>
                        <div class="hsv-inputs">
                            <label>Yellow Goal</label>
                            <div class="hsv-range-container" id="YellowGoal">
                                <div class="hsv-container hsv-min" id="yellowGoal-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="yellowGoal-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>
                        <div class="hsv-inputs">
                            <label>Blue Goal</label>
                            <div class="hsv-range-container" id="BlueGoal">
                                <div class="hsv-container hsv-min" id="blueGoal-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="blueGoal-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>
                        <div class="hsv-inputs">
                            <label>Field</label>
                            <div class="hsv-range-container" id="GreenField">
                                <div class="hsv-container hsv-min" id="greenField-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="greenField-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>

                        
                        <div class="hsv-inputs">
                            <label>Lines</label>
                            <div class="hsv-range-container" id="WhiteLines">
                                <div class="hsv-container hsv-min" id="whiteLines-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="whiteLines-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>

                        
                        <div class="hsv-inputs">
                            <label>Silver</label>
                            <div class="hsv-range-container" id="Silver">
                                <div class="hsv-container hsv-min" id="silver-min">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                                <div class="hsv-container hsv-max" id="silver-max">
                                    <input type="number" class="hsv-input" min="0" max="180" step="1" value="90">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                    <input type="number" class="hsv-input" min="0" max="255" step="1" value="128">
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    `,

    setup() {
        // Initialize visionProfiles if it doesn't exist
        if (!window.appData.visionProfiles) {
            window.appData.visionProfiles = {
                currentlySelected: "",
                profiles: []
            };
        }

        const profileData = window.appData.visionProfiles;
        const profileList = document.getElementById('vision-profile-list');
        const newProfileBtn = profileList.querySelector('.vision-profile-item.new-profile');

        function rgb2hsv(r, g, b) {
            let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc, percentRoundFn;
            rabs = r / 255;
            gabs = g / 255;
            babs = b / 255;
            v = Math.max(rabs, gabs, babs),
            diff = v - Math.min(rabs, gabs, babs);
            diffc = c => (v - c) / 6 / diff + 1 / 2;
            percentRoundFn = num => Math.round(num * 100) / 100;
            if (diff == 0) {
                h = s = 0;
            } else {
                s = diff / v;
                rr = diffc(rabs);
                gg = diffc(gabs);
                bb = diffc(babs);

                if (rabs === v) {
                    h = bb - gg;
                } else if (gabs === v) {
                    h = (1 / 3) + rr - bb;
                } else if (babs === v) {
                    h = (2 / 3) + gg - rr;
                }
                if (h < 0) {
                    h += 1;
                }else if (h > 1) {
                    h -= 1;
                }
            }
            return {
                h: Math.round(h * 180),
                s: Math.round(s * 255),
                v: Math.round(v * 255)
            };
        }

        function hsv2rgb(h, s, v) {
            // Convert from OpenCV HSV (H: 0-180, S: 0-255, V: 0-255) to standard HSV (H: 0-360, S: 0-1, V: 0-1)
            h = h * 2;  // Convert from 0-180 to 0-360
            s = s / 255;  // Convert from 0-255 to 0-1
            v = v / 255;  // Convert from 0-255 to 0-1

            const hi = Math.floor(h / 60);
            const f = h / 60 - hi;
            const p = v * (1 - s);
            const q = v * (1 - f * s);
            const t = v * (1 - (1 - f) * s);
            
            let r, g, b;
            
            switch (hi) {
                case 0: r = v; g = t; b = p; break;
                case 1: r = q; g = v; b = p; break;
                case 2: r = p; g = v; b = t; break;
                case 3: r = p; g = q; b = v; break;
                case 4: r = t; g = p; b = v; break;
                case 5: r = v; g = p; b = q; break;
                default: r = v; g = t; b = p;
            }
            
            // Convert back to 0-255 range
            return {
                r: Math.round(r * 255),
                g: Math.round(g * 255),
                b: Math.round(b * 255)
            };
        }

        class HSVInput {
            constructor(containerId) {
                this.container = document.getElementById(containerId);
                this.inputs = {
                    h: this.container.children[0],
                    s: this.container.children[1],
                    v: this.container.children[2]
                };

                // Setup event listeners
                Object.values(this.inputs).forEach(input => {
                    input.addEventListener('input', () => {
                        this.updateColor();
                    });
                });

                this.container.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    this.openEyeDropper().catch(error => {
                        console.warn('EyeDropper failed:', error.message);
                    });
                });

                // Initial color
                this.updateColor();
            }

            updateColor() {
                const h = parseInt(this.inputs.h.value);
                const s = parseInt(this.inputs.s.value);
                const v = parseInt(this.inputs.v.value);
                
                if (!isNaN(h) && !isNaN(s) && !isNaN(v)) {
                    const rgb = hsv2rgb(h, s, v);
                    this.container.style.backgroundColor = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
                    // const textColor = v > 200 ? 'black' : 'white';
                    const textColor = 'white';
                    Object.values(this.inputs).forEach(input => {
                        input.style.color = textColor;
                    });
                }
            }

            async openEyeDropper() {
                if (!window.EyeDropper) {
                    console.warn("EyeDropper not supported in this browser");
                    return;
                }

                try {
                    const eyeDropper = new EyeDropper();
                    const result = await eyeDropper.open({
                        signal: AbortSignal.timeout(60000)
                    });

                    const hex = result.sRGBHex;
                    const r = parseInt(hex.slice(1, 3), 16);
                    const g = parseInt(hex.slice(3, 5), 16);
                    const b = parseInt(hex.slice(5, 7), 16);
                    
                    const hsv = rgb2hsv(r, g, b);
                    
                    this.inputs.h.value = hsv.h;
                    this.inputs.s.value = hsv.s;
                    this.inputs.v.value = hsv.v;
                    
                    this.updateColor();
                    
                    // Trigger save after eyedropper update
                    saveProfileChanges();
                    
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.warn('EyeDropper error:', error);
                    }
                }
            }
        }

        // Function to load profiles into the list
        function loadProfiles() {
            // Clear existing profile buttons (except the "new" button)
            const buttons = profileList.querySelectorAll('.vision-profile-item:not(.new-profile)');
            buttons.forEach(btn => btn.remove());

            // Add profile buttons
            profileData.profiles.forEach(profile => {
                const profileBtn = document.createElement('button');
                profileBtn.className = 'vision-profile-item pointer-enabled';
                if (profile.name === profileData.currentlySelected) {
                    profileBtn.classList.add('vision-selected-profile');
                }
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = profile.name;
                
                const deleteContainer = document.createElement('div');
                deleteContainer.className = 'vision-delete-container';
                
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'material-icons vision-delete-profile';
                deleteBtn.textContent = 'close';
                deleteBtn.title = 'Delete profile';
                
                deleteContainer.appendChild(deleteBtn);
                profileBtn.appendChild(nameSpan);
                profileBtn.appendChild(deleteContainer);
                profileBtn.dataset.profileName = profile.name;

                // Add drag and drop handlers
                profileBtn.draggable = true;
                
                profileBtn.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', profile.name);
                    profileBtn.classList.add('dragging');
                });

                profileBtn.addEventListener('dragend', () => {
                    profileBtn.classList.remove('dragging');
                    document.querySelectorAll('.vision-profile-item').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                });

                profileBtn.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!profileBtn.classList.contains('new-profile')) {
                        profileBtn.classList.add('drag-over');
                    }
                });

                profileBtn.addEventListener('dragleave', () => {
                    profileBtn.classList.remove('drag-over');
                });

                profileBtn.addEventListener('drop', (e) => {
                    e.preventDefault();
                    const draggedName = e.dataTransfer.getData('text/plain');
                    const dropTargetName = profile.name;
                    
                    if (draggedName === dropTargetName) return;
                    
                    const draggedIndex = profileData.profiles.findIndex(p => p.name === draggedName);
                    const dropTargetIndex = profileData.profiles.findIndex(p => p.name === dropTargetName);
                    
                    if (draggedIndex !== -1 && dropTargetIndex !== -1) {
                        // Reorder the profiles array
                        const [draggedProfile] = profileData.profiles.splice(draggedIndex, 1);
                        profileData.profiles.splice(dropTargetIndex, 0, draggedProfile);
                        
                        // Update the display
                        loadProfiles();
                    }
                    
                    profileBtn.classList.remove('drag-over');
                });

                // Add delete handler
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    
                    const profileIndex = profileData.profiles.findIndex(p => p.name === profile.name);
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
            const currentProfile = profileData.profiles.find(p => p.name === profileData.currentlySelected);
            if (!currentProfile) return;

            // Helper function to get HSV values from inputs
            const getHSVValues = (minId, maxId) => {
                const minInputs = document.querySelectorAll(`#${minId} input`);
                const maxInputs = document.querySelectorAll(`#${maxId} input`);
                return {
                    min: {
                        h: parseInt(minInputs[0].value) || 0,
                        s: parseInt(minInputs[1].value) || 0,
                        v: parseInt(minInputs[2].value) || 0
                    },
                    max: {
                        h: parseInt(maxInputs[0].value) || 0,
                        s: parseInt(maxInputs[1].value) || 0,
                        v: parseInt(maxInputs[2].value) || 0
                    },
                    // Preserve mask_on property if it exists, otherwise default to false
                    mask_on: currentProfile.ball?.mask_on || false
                };
            };

            // Save HSV values for each object
            currentProfile.ball = getHSVValues('ball-min', 'ball-max');
            currentProfile.yellowGoal = {
                ...getHSVValues('yellowGoal-min', 'yellowGoal-max'),
                mask_on: currentProfile.yellowGoal?.mask_on || false
            };
            currentProfile.blueGoal = {
                ...getHSVValues('blueGoal-min', 'blueGoal-max'),
                mask_on: currentProfile.blueGoal?.mask_on || false
            };
            currentProfile.greenField = {
                ...getHSVValues('greenField-min', 'greenField-max'),
                mask_on: currentProfile.greenField?.mask_on || false
            };

            currentProfile.whiteLines = {
                ...getHSVValues('whiteLines-min', 'whiteLines-max'),
                mask_on: currentProfile.whiteLines?.mask_on || false
            };

            currentProfile.silver = {
                ...getHSVValues('silver-min', 'silver-max'),
                mask_on: currentProfile.silver?.mask_on || false
            };

            currentProfile.camera = {}
            currentProfile.camera.saturation = parseFloat(document.getElementById('camera-saturation').value) || 1.0;
            currentProfile.camera.exposure = parseFloat(document.getElementById('camera-exposure').value) || 10000;

            console.log(currentProfile);

            // Update window.appData
            const profileIndex = window.appData.visionProfiles.profiles.findIndex(
                p => p.name === profileData.currentlySelected
            );
            if (profileIndex !== -1) {
                window.appData.visionProfiles.profiles[profileIndex] = currentProfile;
                // Send updated data to backend
                window.sendAppData();
            }

            console.log('APPDATA');
            console.log(window.appData.visionProfiles);
        }

        // Create HSV input instances once
        const hsvInputs = {
            ball: {
                min: new HSVInput('ball-min'),
                max: new HSVInput('ball-max')
            },
            yellowGoal: {
                min: new HSVInput('yellowGoal-min'),
                max: new HSVInput('yellowGoal-max')
            },
            blueGoal: {
                min: new HSVInput('blueGoal-min'),
                max: new HSVInput('blueGoal-max')
            },
            greenField: {
                min: new HSVInput('greenField-min'),
                max: new HSVInput('greenField-max')
            },
            silver: {
                min: new HSVInput('silver-min'),
                max: new HSVInput('silver-max')
            }
        };

        // Update loadProfileSettings to remove HSVInput creation
        function loadProfileSettings(profileName) {
            const profile = profileData.profiles.find(p => p.name === profileName);
            if (!profile) return;

            document.getElementById('vision-profile-name').value = profile.name;

            // Helper function to set HSV values and add log button
            const setHSVValues = (minId, maxId, values, objectName) => {
                if (!values) return;
                
                // Set HSV values as before
                const minInputs = document.querySelectorAll(`#${minId} input`);
                const maxInputs = document.querySelectorAll(`#${maxId} input`);
                ['h', 's', 'v'].forEach((component, i) => {
                    minInputs[i].value = values.min[component];
                    maxInputs[i].value = values.max[component];
                });

                // Add log button if it doesn't exist
                const container = document.getElementById(minId).parentElement;
                let logBtn = container.querySelector('.hsv-log-btn');
                if (!logBtn) {
                    // console.log('createlogbtn')
                    logBtn = document.createElement('button');
                    logBtn.className = 'hsv-log-btn';
                    logBtn.title = 'Log HSV values';
                    logBtn.onclick = () => {
                        // Deactivate all other buttons
                        document.querySelectorAll('.hsv-log-btn.active').forEach(btn => {
                            if (btn !== logBtn) {
                                btn.classList.remove('active');
                            }
                        });

                        // Toggle this button
                        logBtn.classList.toggle('active');

                        // Get current profile
                        const currentProfile = profileData.profiles.find(p => p.name === profileData.currentlySelected);
                        if (!currentProfile) return;

                        // Set all mask_on properties to false first
                        ['ball', 'yellowGoal', 'blueGoal', 'greenField', 'whiteLines', 'silver'].forEach(objName => {
                            if (currentProfile[objName].mask_on) {
                                currentProfile[objName].mask_on = false;
                            }
                        });

                        // Set mask_on for the clicked object
                        const objectKey = objectName.replace(' ', '').charAt(0).toLowerCase() + objectName.replace(' ', '').slice(1);
                        if (logBtn.classList.contains('active')) {
                            currentProfile[objectKey].mask_on = true;
                            console.log(`HSV Range for ${objectName}:`, {
                                min: {
                                    h: parseInt(minInputs[0].value),
                                    s: parseInt(minInputs[1].value),
                                    v: parseInt(minInputs[2].value)
                                },
                                max: {
                                    h: parseInt(maxInputs[0].value),
                                    s: parseInt(maxInputs[1].value),
                                    v: parseInt(maxInputs[2].value)
                                }
                            });
                        } else {
                            currentProfile[objectKey].mask_on = false;
                        }

                        console.log(currentProfile);
                        console.log("Setting mask_on to", currentProfile[objectKey].mask_on);

                        // Send updated data to backend
                        window.sendAppData();
                    };
                    container.appendChild(logBtn);
                }

                // Set active state based on mask_on property
                const objectKey = objectName.replace(' ', '').charAt(0).toLowerCase() + objectName.replace(' ', '').slice(1);
                if (values.mask_on) {
                    logBtn.classList.add('active');
                } else {
                    logBtn.classList.remove('active');
                }
            };

            // Load HSV values for each object with their names
            setHSVValues('ball-min', 'ball-max', profile.ball, 'Ball');
            setHSVValues('yellowGoal-min', 'yellowGoal-max', profile.yellowGoal, 'Yellow Goal');
            setHSVValues('blueGoal-min', 'blueGoal-max', profile.blueGoal, 'Blue Goal');
            setHSVValues('greenField-min', 'greenField-max', profile.greenField, 'Green Field');
            setHSVValues('whiteLines-min', 'whiteLines-max', profile.whiteLines, 'White Lines');
            setHSVValues('silver-min', 'silver-max', profile.silver, 'Silver');

            // Load camera settings with defaults
            const cameraSettings = profile.camera || {};
            document.getElementById('camera-exposure').value = cameraSettings.exposure || 10000;
            document.getElementById('camera-saturation').value = cameraSettings.saturation || 1.0;
            
            // Update colors for all HSV inputs
            Object.values(hsvInputs).forEach(pair => {
                pair.min.updateColor();
                pair.max.updateColor();
            });
        }

        // Update new profile template
        newProfileBtn.addEventListener('click', () => {
            // Get currently selected profile's HSV values, or use defaults if none selected
            const currentProfile = profileData.profiles.find(p => p.name === profileData.currentlySelected);
            const defaultHSV = {
                min: { h: 90, s: 128, v: 128 },
                max: { h: 90, s: 128, v: 128 }
            };

            const newProfile = {
                name: `Profile ${profileData.profiles.length + 1}`,
                // Copy HSV values from current profile if it exists, otherwise use defaults
                ball: currentProfile ? { ...currentProfile.ball } : { ...defaultHSV },
                yellowGoal: currentProfile ? { ...currentProfile.yellowGoal } : { ...defaultHSV },
                blueGoal: currentProfile ? { ...currentProfile.blueGoal } : { ...defaultHSV },
                greenField: currentProfile ? { ...currentProfile.greenField } : { ...defaultHSV },
                whiteLines: currentProfile ? { ...currentProfile.whiteLines } : { ...defaultHSV },
                silver: currentProfile ? { ...currentProfile.silver } : { ...defaultHSV },
                camera: {
                    exposure: currentProfile ? currentProfile.camera.exposure : 10000,
                    saturation: currentProfile ? currentProfile.camera.saturation : 1.0
                }
            };

            profileData.profiles.push(newProfile);
            profileData.currentlySelected = newProfile.name;
            
            loadProfiles();
            loadProfileSettings(newProfile.name);
        });

        // Event handler for profile selection
        profileList.addEventListener('click', (e) => {
            const profileItem = e.target.closest('.vision-profile-item');
            if (!profileItem || profileItem.classList.contains('new-profile')) return;

            document.querySelectorAll('.vision-profile-item').forEach(item => {
                item.classList.remove('vision-selected-profile');
            });
            profileItem.classList.add('vision-selected-profile');

            profileData.currentlySelected = profileItem.dataset.profileName;
            loadProfileSettings(profileItem.dataset.profileName);
            
            // Send updated data to backend after switching profiles
            window.sendAppData();
        });

        // Add event listener for profile name changes
        const profileNameInput = document.getElementById('vision-profile-name');
        profileNameInput.addEventListener('input', (e) => {
            const currentProfile = profileData.profiles.find(p => p.name === profileData.currentlySelected);
            if (currentProfile) {
                currentProfile.name = e.target.value;
                profileData.currentlySelected = e.target.value;
                loadProfiles();
            }
        });

        // Add event listeners for all HSV inputs
        function setupHSVInputListeners() {
            const hsvContainers = [
                'ball-min', 'ball-max',
                'yellowGoal-min', 'yellowGoal-max',
                'blueGoal-min', 'blueGoal-max',
                'greenField-min', 'greenField-max',
                'whiteLines-min', 'whiteLines-max',
                'silver-min', 'silver-max',
            ];

            hsvContainers.forEach(containerId => {
                document.querySelectorAll(`#${containerId} input`).forEach(input => {
                    input.addEventListener('input', saveProfileChanges);
                });
            });
        }

        // Add HSV input listeners
        setupHSVInputListeners();

        // Add after setupHSVInputListeners()
        function setupCameraInputListeners() {
            const cameraInputs = [
                'camera-exposure',
                'camera-saturation'
            ];

            cameraInputs.forEach(inputId => {
                document.getElementById(inputId).addEventListener('input', saveProfileChanges);
            });
        }

        // Update the setup section to include the new listener setup
        // Add after setupHSVInputListeners();
        setupCameraInputListeners();

        // Initial load
        loadProfiles();
        if (profileData.currentlySelected) {
            loadProfileSettings(profileData.currentlySelected);
        }
    }
}); 
