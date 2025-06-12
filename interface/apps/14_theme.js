appRegistry.register('theme', {
    title: 'Theme Settings',
    icon: 'palette',
    template: `
        <style>
            .theme-item {
                position: relative;
                padding-right: 2rem !important;  /* Space for delete button */
                cursor: pointer;
                user-select: none;
            }
            
            /* Override padding for new theme button */
            .theme-item.new-theme {
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
            
            /* Don't show delete button on new theme button */
            .new-theme .delete-container {
                display: none;
            }

            /* Add styles for drag and drop */
            .theme-item.dragging {
                opacity: 0.5;
                cursor: pointer;
            }

            .theme-item.drag-over {
                border-top: 2px solid var(--accent);
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">palette</span>
                        <h3>Theme Profiles</h3>
                    </div>
                    <div class="theme-list pointer-enabled" id="theme-list">
                        <!-- Themes will be inserted here dynamically -->
                        <button class="theme-item new-theme pointer-enabled">
                            <span class="material-icons">add</span>
                        </button>
                    </div>
                </div>
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">color_lens</span>
                        <h3>Color Settings</h3>
                    </div>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div class="input-row">
                            <label>Theme Name</label>
                            <input type="text" id="theme-name" placeholder="Enter theme name">
                        </div>

                        <div style="font-size: 0.75rem; opacity: 0.5; margin-bottom: 0.15rem; margin-top: 0.7rem;">Interface</div>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="color" id="accent-color" value="#8d6fed" title="Accent Color" style="width: 2rem; padding: 0;">
                            <input type="color" id="card-foreground" value="#f4eeff" title="Text Color" style="width: 2rem; padding: 0;">
                            <input type="color" id="card-background" value="#1a1826" title="Card Color" style="width: 2rem; padding: 0;">
                            <input type="color" id="border-color" value="#ccb8d9" title="Border Color" style="width: 2rem; padding: 0;">
                            <input type="number" 
                                   id="card-opacity" 
                                   value="0.1" 
                                   step="0.05"
                                   title="Card Opacity" 
                                   style="flex-basis: 2rem; flex-grow: 0; height: 1.3rem; padding: 0; font-size: 0.6rem; text-align: center; margin-top: 0.1rem;"
                                   min="0"
                                   max="1">
                            <input type="number" 
                                   id="card-blur" 
                                   value="16" 
                                   step="2"
                                   title="Card Blur" 
                                   style="flex-basis: 2rem; flex-grow: 0; height: 1.3rem; padding: 0; font-size: 0.6rem; text-align: center; margin-top: 0.1rem;"
                                   min="0"
                                   max="50">
                        </div>
                        
                        <div style="font-size: 0.75rem; opacity: 0.5; margin-bottom: 0.25rem; margin-top: 0.7rem;">Background</div>
                        <div style="display: flex; flex: 1; gap: 0.5rem;">
                            <button class="background-type-btn selected-type" data-type="image"
                                style="flex: 1; background: rgba(26,24,38,0.2); border: none; outline: none; color: var(--foreground); 
                                padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: inherit; font-size: 0.75rem; 
                                transition: all 0.2s ease; cursor: pointer;">Image</button>
                            <button class="background-type-btn" data-type="solid"
                                style="flex: 1; background: rgba(26,24,38,0.2); border: none; outline: none; color: var(--foreground); 
                                padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: inherit; font-size: 0.75rem; 
                                transition: all 0.2s ease; cursor: pointer;">Solid</button>
                            <button class="background-type-btn" data-type="glow"
                                style="flex: 1; background: rgba(26,24,38,0.2); border: none; outline: none; color: var(--foreground); 
                                padding: 0.25rem 0.5rem; border-radius: 0.25rem; font-family: inherit; font-size: 0.75rem; 
                                transition: all 0.2s ease; cursor: pointer;">Glow</button>
                        </div>
                        <div id="background-image-settings" style="display: none; width: 100%;">
                            <input type="file" 
                                id="background-image-file" 
                                accept="image/*"
                                style="display: none">
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="text" 
                                    id="background-image-filename" 
                                    placeholder="Click to select image"
                                    readonly
                                    style="cursor: pointer; flex: 1;">
                                <input type="color" 
                                    id="background-image-tint" 
                                    value="#13111a" 
                                    title="Image Tint" 
                                    style="width: 2rem; padding: 0;">
                            </div>
                        </div>
                        <div id="background-solid-settings" style="display: none;">
                            <input type="color" id="solid-background-color" value="#13111a" title="Background Color" style="width: 2rem; padding: 0;">
                        </div>
                        <div id="background-glow-settings" style="display: none;">
                            <div style="display: flex; gap: 0.5rem;">
                                <input type="color" id="glow-background-color" value="#13111a" title="Background Color" style="width: 2rem; padding: 0;">
                                <input type="color" id="glow-color" value="#9d4edd" title="Glow Color" style="width: 2rem; padding: 0;">
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    setup() {
        const themeData = window.appData.themeSettings;
        const themeList = document.getElementById('theme-list');
        const newThemeBtn = themeList.querySelector('.new-theme');

        // Function to load themes into the list
        function loadThemes() {
            // Clear existing theme buttons (except the "new" button)
            const buttons = themeList.querySelectorAll('.theme-item:not(.new-theme)');
            buttons.forEach(btn => btn.remove());

            // Add theme buttons
            themeData.themes.forEach(theme => {
                const themeBtn = document.createElement('button');
                themeBtn.className = 'theme-item pointer-enabled';
                if (theme.name === themeData.currentlySelected) {
                    themeBtn.classList.add('selected-theme');
                }
                
                // Create container for theme name
                const nameSpan = document.createElement('span');
                nameSpan.textContent = theme.name;
                
                // Create delete container and button
                const deleteContainer = document.createElement('div');
                deleteContainer.className = 'delete-container';
                
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'material-icons delete-theme';
                deleteBtn.textContent = 'close';
                deleteBtn.title = 'Delete theme';
                
                deleteContainer.appendChild(deleteBtn);
                themeBtn.appendChild(nameSpan);
                themeBtn.appendChild(deleteContainer);
                themeBtn.dataset.themeName = theme.name;

                // Add drag and drop handlers
                themeBtn.draggable = true;
                
                themeBtn.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    themeBtn.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', theme.name);
                });

                themeBtn.addEventListener('dragend', () => {
                    themeBtn.classList.remove('dragging');
                    document.querySelectorAll('.theme-item').forEach(item => {
                        item.classList.remove('drag-over');
                    });
                });

                themeBtn.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    if (!e.currentTarget.classList.contains('new-theme')) {
                        e.currentTarget.classList.add('drag-over');
                    }
                });

                themeBtn.addEventListener('dragleave', (e) => {
                    e.currentTarget.classList.remove('drag-over');
                });

                themeBtn.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const draggedThemeName = e.dataTransfer.getData('text/plain');
                    const dropTargetName = e.currentTarget.dataset.themeName;
                    
                    if (draggedThemeName === dropTargetName) return;
                    
                    // Find indices
                    const draggedIndex = themeData.themes.findIndex(t => t.name === draggedThemeName);
                    const dropIndex = themeData.themes.findIndex(t => t.name === dropTargetName);
                    
                    if (draggedIndex !== -1 && dropIndex !== -1) {
                        // Reorder array
                        const [draggedTheme] = themeData.themes.splice(draggedIndex, 1);
                        themeData.themes.splice(dropIndex, 0, draggedTheme);
                        
                        // Refresh the list
                        loadThemes();
                    }
                });
                
                // Add delete handler
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (themeData.themes.length <= 1) return;
                    
                    const themeIndex = themeData.themes.findIndex(t => t.name === theme.name);
                    themeData.themes.splice(themeIndex, 1);
                    
                    if (theme.name === themeData.currentlySelected) {
                        const newTheme = themeData.themes[Math.max(0, themeIndex - 1)];
                        themeData.currentlySelected = newTheme.name;
                        loadThemeSettings(newTheme.name);
                        updateThemeColors(newTheme);
                    }
                    
                    loadThemes();
                });
                
                themeList.insertBefore(themeBtn, newThemeBtn);
            });
        }

        // Function to load theme settings into the color panel
        function loadThemeSettings(themeName) {
            const theme = themeData.themes.find(t => t.name === themeName);
            if (!theme) return;

            // Update inputs with theme values
            document.getElementById('theme-name').value = theme.name;
            document.getElementById('accent-color').value = theme.accent_color;
            document.getElementById('card-foreground').value = theme.card_foreground_color;
            document.getElementById('card-background').value = theme.card_background_color;
            document.getElementById('border-color').value = theme.border_color;

            // Update all background color inputs regardless of type
            document.getElementById('background-image-tint').value = theme.background_image_tint_color;
            document.getElementById('background-image-filename').value = theme.background_image_url || '';
            document.getElementById('solid-background-color').value = theme.background_solid_color;
            document.getElementById('glow-background-color').value = theme.background_solid_color;
            document.getElementById('glow-color').value = theme.background_glow_color;

            // Select the appropriate background type button and show/hide settings
            const bgTypeBtn = document.querySelector(`.background-type-btn[data-type="${theme.background_type}"]`);
            if (bgTypeBtn) {
                // Update button styles
                document.querySelectorAll('.background-type-btn').forEach(b => {
                    b.classList.remove('selected-type');
                    b.style.background = 'rgba(26,24,38,0.2)';
                });
                bgTypeBtn.classList.add('selected-type');
                bgTypeBtn.style.background = 'rgba(var(--accent-rgb), 0.15)';

                // Show/hide appropriate settings
                document.querySelectorAll('#background-image-settings, #background-solid-settings, #background-glow-settings')
                    .forEach(el => el.style.display = 'none');
                const settingsElement = document.querySelector(`#background-${theme.background_type}-settings`);
                if (settingsElement) {
                    settingsElement.style.display = 'block';
                }
            }

            // Add card opacity input update
            document.getElementById('card-opacity').value = theme.card_opacity || 0.25;
            document.getElementById('card-blur').value = theme.card_blur || 16;
        }

        // Function to update CSS variables
        function updateThemeColors(theme) {

            console.log('updateThemeColors', theme);
            // Update RGB variables first
            document.documentElement.style.setProperty('--accent-color', theme.accent_color);
            document.documentElement.style.setProperty('--card-foreground-color', theme.card_foreground_color);
            document.documentElement.style.setProperty('--card-background-color', theme.card_background_color);
            document.documentElement.style.setProperty('--border-color', theme.border_color);

            document.documentElement.style.setProperty('--accent-rgb', hexToRgb(theme.accent_color));
            document.documentElement.style.setProperty('--foreground-rgb', hexToRgb(theme.card_foreground_color));
            document.documentElement.style.setProperty('--card-bg-rgb', hexToRgb(theme.card_background_color));
            document.documentElement.style.setProperty('--border-rgb', hexToRgb(theme.border_color));
            document.documentElement.style.setProperty('--background-rgb', hexToRgb(theme.background_solid_color));

            console.log(hexToRgb(theme.card_background_color));
            

            // Update derived colors
            document.documentElement.style.setProperty('--accent', `rgb(var(--accent-rgb))`);
            document.documentElement.style.setProperty('--foreground', `rgb(var(--foreground-rgb))`);
            document.documentElement.style.setProperty('--background', theme.background_solid_color);

            
            
            // Update background based on type
            if (theme.background_type === 'image') {
                document.documentElement.style.setProperty('--background-image', `url('${theme.background_image_url}')`);
                document.documentElement.style.setProperty('--background-tint', 
                    `rgba(${hexToRgb(theme.background_image_tint_color)},0.1)`);
            } else if (theme.background_type === 'solid') {
                document.documentElement.style.setProperty('--background-image', 'none');
                document.documentElement.style.setProperty('--background-tint', 'none');
            } else if (theme.background_type === 'glow') {
                document.documentElement.style.setProperty('--background-image', 
                    `radial-gradient(circle at 100% 0, rgba(${hexToRgb(theme.background_glow_color)}, .1) 0, transparent 35%), 
                     radial-gradient(circle at 0 100%, rgba(${hexToRgb(theme.background_glow_color)}, .1) 0, transparent 35%)`);
                document.documentElement.style.setProperty('--background-tint', 'none');
            }

            // Update card opacity
            document.documentElement.style.setProperty('--card-opacity', theme.card_opacity);
            document.documentElement.style.setProperty('--card-blur', `${theme.card_blur}px`);
        }

        // Event handler for theme selection
            themeList.addEventListener('click', (e) => {
                const themeItem = e.target.closest('.theme-item');
            if (!themeItem || themeItem.classList.contains('new-theme')) return;

            // Update selection in UI
                    document.querySelectorAll('.theme-item').forEach(item => {
                        item.classList.remove('selected-theme');
                    });
                    themeItem.classList.add('selected-theme');

            // Update current theme in data
            themeData.currentlySelected = themeItem.dataset.themeName;
            
            // Load theme settings and update colors
            loadThemeSettings(themeItem.dataset.themeName);
            updateThemeColors(getCurrentTheme());
        });

        // Event handler for new theme button
        newThemeBtn.addEventListener('click', () => {
            const newTheme = {
                name: `Theme ${themeData.themes.length + 1}`,
                accent_color: '#8d6fed',
                card_foreground_color: '#f4eeff',
                card_background_color: '#1a1826',
                border_color: '#ccb8d9',
                card_opacity: 0.25,
                card_blur: 16,
                background_type: 'image',
                background_image_url: 'backgrounds/cliff.png',
                background_image_tint_color: '#13111a',
                background_solid_color: '#13111a',
                background_glow_color: '#9d4edd'
            };

            themeData.themes.push(newTheme);
            themeData.currentlySelected = newTheme.name;
            
            loadThemes();
            loadThemeSettings(newTheme.name);
            updateThemeColors(newTheme);
        });

        // Helper function to convert hex to rgb
        function hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? 
                `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
                '0, 0, 0';
        }

        // Function to get current theme
        function getCurrentTheme() {
            return themeData.themes.find(t => t.name === themeData.currentlySelected);
        }

        // Function to save theme changes
        function saveThemeChanges(changes) {
            const currentTheme = getCurrentTheme();
            if (!currentTheme) return;

            Object.assign(currentTheme, changes);
            updateThemeColors(currentTheme);
        }

        // Update color input mappings
        const colorInputs = {
            'accent-color': 'accent_color',
            'card-foreground': 'card_foreground_color',
            'card-background': 'card_background_color',
            'border-color': 'border_color',
            'background-image-tint': 'background_image_tint_color',
            'solid-background-color': 'background_solid_color',
            'glow-background-color': 'background_solid_color',
            'glow-color': 'background_glow_color'
        };

        Object.entries(colorInputs).forEach(([inputId, themeProperty]) => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', (e) => {
                    saveThemeChanges({ [themeProperty]: e.target.value });
                });
            }
        });

        // Add event listener for theme name changes
        const themeNameInput = document.getElementById('theme-name');
        if (themeNameInput) {
            themeNameInput.addEventListener('input', (e) => {
                const currentTheme = getCurrentTheme();
                if (!currentTheme) return;

                const newName = e.target.value.trim();
                if (newName && newName !== currentTheme.name) {
                    currentTheme.name = newName;
                    themeData.currentlySelected = newName;
                    loadThemes(); // Refresh theme list
                }
            });
        }

        // Background type button handling
        const backgroundBtns = document.querySelectorAll('.background-type-btn');
        if (backgroundBtns.length) {
            backgroundBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    // Remove selected class from all buttons
                    backgroundBtns.forEach(b => {
                        b.classList.remove('selected-type');
                        b.style.background = 'rgba(26,24,38,0.2)';
                    });
                    
                    // Add selected class to clicked button
                    btn.classList.add('selected-type');
                    btn.style.background = 'rgba(var(--accent-rgb), 0.15)';

                    // Hide all settings first
                    document.querySelectorAll('#background-image-settings, #background-solid-settings, #background-glow-settings')
                        .forEach(el => el.style.display = 'none');

                    // Show the relevant settings
                    const selectedType = btn.dataset.type;
                    const settingsElement = document.querySelector(`#background-${selectedType}-settings`);
                    if (settingsElement) {
                        settingsElement.style.display = 'block';
                    }

                    const currentTheme = getCurrentTheme();
                    // Update theme with new background type
                    saveThemeChanges({ 
                        background_type: selectedType,
                        // When switching to image type, restore the last image URL if none exists
                        ...(selectedType === 'image' && !currentTheme.background_image_url && { 
                            background_image_url: 'backgrounds/cliff.png' 
                        }),
                        // When switching to other types, keep the image URL in memory but set to none
                        ...(selectedType === 'solid' && { background_image: 'none' }),
                        ...(selectedType === 'glow' && { background_image: 'none' })
                    });
                });
            });
        }

        // Update the file upload handling
        const fileInput = document.querySelector('#background-image-file');
        const filenameInput = document.querySelector('#background-image-filename');
        
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
                            // Save image through IPC
                            const imageUrl = await window.ipcRenderer.invoke('save-background-image', {
                                imageData: e.target.result,
                                filename: file.name
                            });
                            
                            // Update UI and theme data
                            filenameInput.value = imageUrl;
                            saveThemeChanges({ 
                                background_image_url: imageUrl
                            });
                        } catch (error) {
                            console.error('Failed to save background image:', error);
                            // You might want to show an error message to the user here
                        }
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Update initial theme colors when loading
        function initializeTheme() {
            const currentTheme = getCurrentTheme();
            if (currentTheme) {
                updateThemeColors(currentTheme);
            }
        }

        // Initial load
        loadThemes();
        if (themeData.currentlySelected) {
            loadThemeSettings(themeData.currentlySelected);
            initializeTheme();
        }

        // Add card opacity to the input event handlers
        const cardOpacityInput = document.getElementById('card-opacity');
        if (cardOpacityInput) {
            cardOpacityInput.addEventListener('input', (e) => {
                saveThemeChanges({ card_opacity: parseFloat(e.target.value) });
            });
        }

        // Add card blur to the input event handlers
        const cardBlurInput = document.getElementById('card-blur');
        if (cardBlurInput) {
            cardBlurInput.addEventListener('input', (e) => {
                saveThemeChanges({ card_blur: parseInt(e.target.value) });
            });
        }
    }
})