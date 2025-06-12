// Add this near the top of your script section
const { ipcRenderer } = require('electron')

// // Add this near the top of the file, after the ipcRenderer setup
// document.addEventListener('click', (e) => {
//     // console.log('Click target:', e.target);
//     // console.log('Click path:', e.composedPath());
//     // console.log('Target pointer-events:', window.getComputedStyle(e.target).pointerEvents);
    
//     // Log parent elements and their pointer-events
//     let element = e.target;
//     let i = 0;
//     while (element && element !== document.body && i < 5) {
//         // console.log(`Parent ${i}:`, element, 'pointer-events:', window.getComputedStyle(element).pointerEvents);
//         element = element.parentElement;
//         i++;
//     }
// });

// Function to load app data
async function loadAppData() {
    try {
        const data = await ipcRenderer.invoke('get-app-data')
        return data
    } catch (error) {
        console.error('Failed to load app data:', error)
        return null
    }
}

// Function to save app data
async function saveAppData(data) {
    try {
        const savedData = await ipcRenderer.invoke('save-app-data', data)
        return savedData
    } catch (error) {
        console.error('Failed to save app data:', error)
        return null
    }
}

// Function to start auto-save
function startAutoSave() {
    // Save every 5 seconds
    setInterval(() => {
        // Only save if window.appData exists
        if (window.appData) {
            saveAppData(window.appData)
        }
    }, 5000)
}

// Modify the initializeApp function to handle the correct theme structure
async function initializeApp() {
    window.appData = await loadAppData()
    if (window.appData?.themeSettings?.currentlySelected) {
        const currentTheme = window.appData.themeSettings.themes.find(
            theme => theme.name === window.appData.themeSettings.currentlySelected
        )
        if (currentTheme) {
            // Apply theme variables
            document.documentElement.style.setProperty('--accent-color', currentTheme.accent_color)
            document.documentElement.style.setProperty('--card-foreground-color', currentTheme.card_foreground_color)
            document.documentElement.style.setProperty('--card-background-color', currentTheme.card_background_color)
            document.documentElement.style.setProperty('--border-color', currentTheme.border_color)
            // ... set other theme variables as needed
        }
    }
    
    // Start auto-save after initialization
    startAutoSave()
}

// Call initialize when document is ready
document.addEventListener('DOMContentLoaded', initializeApp)

// Welcome message typing animation
function typeMessage(message) {
    const welcomeMessage = document.getElementById('welcome-message');
    let index = 0;

    function addCharacter() {
        if (index < message.length) {
            const span = document.createElement('span');
            span.textContent = message[index];
            span.className = 'typing-animation';
            welcomeMessage.appendChild(span);
            index++;
            setTimeout(addCharacter, 120);
        } else {
            // Start fade out after typing is complete
            setTimeout(() => {
                welcomeMessage.classList.add('fade-out');
                setTimeout(() => {
                    welcomeMessage.innerHTML = '';
                    welcomeMessage.classList.remove('fade-out');
                }, 300);
            }, 3000);
        }
    }

    addCharacter();
}

// Start typing animation 1 second after page loads
setTimeout(typeMessage, 1500, "WELCOME TO HIKARI OS");

// // 15th of july 2025
// const internationalsDate = new Date(2025, 6, 15);
// // time until internationals
// const timeUntilInternationals = Math.ceil((internationalsDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
// setTimeout(typeMessage, 4500, `INTERNATIONALS IS IN ${timeUntilInternationals} DAY${timeUntilInternationals === 1 ? '' : 'S'}`);

// App state management
const appState = {
    quadrants: [
        { id: 0, app: null },   // Top Left
        { id: 1, app: null },    // Top Right
        { id: 2, app: null },     // Bottom Left
        { id: 3, app: null }      // Bottom Right
    ],
    isDragging: false,
    draggedApp: null,
    draggedFromQuadrant: null
};

// Helper function to scroll terminal output to bottom
function scrollTerminalToBottom(element) {
    const terminalOutput = element.querySelector('#terminal-output');
    if (terminalOutput) {
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
}

function animateAppOpen(appId, targetQuadrantId) {
    // Get positions
    const taskbarIcon = document.querySelector(`[data-app="${appId}"]`);
    const iconRect = taskbarIcon.getBoundingClientRect();
    const quadrantEl = document.getElementById(`quadrant-${targetQuadrantId}`);
    const quadrantRect = quadrantEl.getBoundingClientRect();
    const app = document.getElementById(`app-${appId}`);

    // Account for scroll and any body margin
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Temporarily remove style attribute to make app visible for cloning
    const originalStyle = app.getAttribute('style');
    app.removeAttribute('style');

    // Create clone for animation
    const clone = app.cloneNode(true);
    
    // Restore original style
    if (originalStyle) {
        app.setAttribute('style', originalStyle);
    } else {
        app.style.display = 'none';
    }

    // get blur from the current style
    const blur = getComputedStyle(document.documentElement).getPropertyValue('--card-blur');

    console.log('animating app open, setting blur to', blur);

    clone.style.position = 'fixed';
    clone.style.top = (iconRect.top) + 'px';
    clone.style.left = (iconRect.left) + 'px';
    clone.style.width = '40px';
    clone.style.height = '40px';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backdropFilter = `blur(${blur})`; 
    clone.style.webkitBackdropFilter = `blur(${blur})`;
    clone.style.transition = 'all 0.3s ease-out';
    clone.style.zIndex = '1000';
    clone.style.opacity = '0.1';
    clone.style.transform = 'scale(0.1)';
    clone.style.boxSizing = 'border-box';
    clone.classList.add('animating');
    if (appId === 'terminal') {
        requestAnimationFrame(() => scrollTerminalToBottom(clone));
    } else if (appId === 'browser') {
        requestAnimationFrame(() => scrollChatToBottom(clone));
    }
    document.body.appendChild(clone);

    // Start animation
    requestAnimationFrame(() => {
        clone.style.transform = 'scale(1)';
        clone.style.width = quadrantRect.width + 'px';
        clone.style.height = quadrantRect.height + 'px';
        clone.style.top = (quadrantRect.top) + 'px';
        clone.style.left = (quadrantRect.left) + 'px';
        clone.style.opacity = '1';
    });

    // Update state and cleanup after animation
    setTimeout(() => {
        clone.remove();
        // Update state
        appState.quadrants[targetQuadrantId].app = appId;
        renderApps();
    }, 300);
}

function animateAppMove(appId, fromQuadrantId, toQuadrantId) {
    const app = document.getElementById(`app-${appId}`);
    const fromQuadrant = document.getElementById(`quadrant-${fromQuadrantId}`);
    const toQuadrant = document.getElementById(`quadrant-${toQuadrantId}`);
    const fromRect = fromQuadrant.getBoundingClientRect();
    const toRect = toQuadrant.getBoundingClientRect();

    // get blur from the current style
    const blur = getComputedStyle(document.documentElement).getPropertyValue('--card-blur');


    // Hide the original app
    document.getElementById('app-templates').appendChild(app);
    app.style.display = 'none';

    // Create clone for animation
    const clone = app.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = fromRect.top + 'px';
    clone.style.left = fromRect.left + 'px';
    clone.style.width = fromRect.width + 'px';
    clone.style.height = fromRect.height + 'px';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.transition = 'all 0.3s ease-out';
    clone.style.zIndex = '1000';
    clone.style.opacity = '1';
    clone.style.boxSizing = 'border-box';
    clone.style.display = 'flex';
    clone.classList.add('animating');
    if (appId === 'terminal') {
        requestAnimationFrame(() => scrollTerminalToBottom(clone));
    } else if (appId === 'browser') {
        requestAnimationFrame(() => scrollChatToBottom(clone));
    }
    document.body.appendChild(clone);

    // Start animation
    requestAnimationFrame(() => {
        clone.style.top = toRect.top + 'px';
        clone.style.left = toRect.left + 'px';
    });

    // Update state and cleanup after animation
    setTimeout(() => {
        clone.remove();
        // Update state
        appState.quadrants[fromQuadrantId].app = null;
        appState.quadrants[toQuadrantId].app = appId;
        renderApps();
    }, 300);
}

function animateAppSwap(app1Id, quadrant1Id, app2Id, quadrant2Id) {
    const app1 = document.getElementById(`app-${app1Id}`);
    const app2 = document.getElementById(`app-${app2Id}`);
    const quadrant1 = document.getElementById(`quadrant-${quadrant1Id}`);
    const quadrant2 = document.getElementById(`quadrant-${quadrant2Id}`);
    const rect1 = quadrant1.getBoundingClientRect();
    const rect2 = quadrant2.getBoundingClientRect();

    // Hide original apps
    document.getElementById('app-templates').appendChild(app1);
    document.getElementById('app-templates').appendChild(app2);
    app1.style.display = 'none';
    app2.style.display = 'none';

    // Create clones for animation
    const clone1 = app1.cloneNode(true);
    const clone2 = app2.cloneNode(true);

    // Set up clone1
    clone1.style.position = 'fixed';
    clone1.style.top = rect1.top + 'px';
    clone1.style.left = rect1.left + 'px';
    clone1.style.width = rect1.width + 'px';
    clone1.style.height = rect1.height + 'px';
    clone1.style.margin = '0';
    clone1.style.padding = '0';
    clone1.style.transition = 'all 0.3s ease-out';
    clone1.style.zIndex = '1000';
    clone1.style.opacity = '1';
    clone1.style.boxSizing = 'border-box';
    clone1.style.display = 'flex';
    clone1.classList.add('animating');
    if (app1Id === 'terminal') {
        requestAnimationFrame(() => scrollTerminalToBottom(clone1));
    } else if (app1Id === 'browser') {
        requestAnimationFrame(() => scrollChatToBottom(clone1));
    }

    // Set up clone2
    clone2.style.position = 'fixed';
    clone2.style.top = rect2.top + 'px';
    clone2.style.left = rect2.left + 'px';
    clone2.style.width = rect2.width + 'px';
    clone2.style.height = rect2.height + 'px';
    clone2.style.margin = '0';
    clone2.style.padding = '0';
    clone2.style.transition = 'all 0.3s ease-out';
    clone2.style.zIndex = '1000';
    clone2.style.opacity = '1';
    clone2.style.boxSizing = 'border-box';
    clone2.style.display = 'flex';
    clone2.classList.add('animating');
    if (app2Id === 'terminal') {
        requestAnimationFrame(() => scrollTerminalToBottom(clone2));
    } else if (app2Id === 'browser') {
        requestAnimationFrame(() => scrollChatToBottom(clone2));
    }

    document.body.appendChild(clone1);
    document.body.appendChild(clone2);

    // Start animation
    requestAnimationFrame(() => {
        clone1.style.top = rect2.top + 'px';
        clone1.style.left = rect2.left + 'px';
        clone2.style.top = rect1.top + 'px';
        clone2.style.left = rect1.left + 'px';
    });

    // Update state and cleanup after animation
    setTimeout(() => {
        clone1.remove();
        clone2.remove();
        // Swap the apps in state
        appState.quadrants[quadrant1Id].app = app2Id;
        appState.quadrants[quadrant2Id].app = app1Id;
        renderApps();
    }, 300);
}

function startAppDrag(appId, fromQuadrantId = null) {
    // console.log(`Starting drag for app: ${appId}`);
    appState.isDragging = true;
    appState.draggedApp = appId;
    appState.draggedFromQuadrant = fromQuadrantId;
    
    // Add dragging class to taskbar icon and card if it exists
    const icon = document.querySelector(`[data-app="${appId}"]`);
    icon.classList.add('dragging');
    const card = document.getElementById(`app-${appId}`);
    if (card) {
        card.classList.add('dragging');
    }

    // Make all quadrants selectable except the source quadrant
    appState.quadrants.forEach(quadrant => {
        // Skip the source quadrant
        if (quadrant.id === fromQuadrantId) return;
        
        const quadrantEl = document.getElementById(`quadrant-${quadrant.id}`);
        // If quadrant is empty or has an app (for swapping), make it selectable
        quadrantEl.classList.add('selectable');
    });

    document.addEventListener('mouseup', stopAppDrag);
}

function stopAppDrag(e) {
    if (!appState.isDragging) return;

    // Check if mouse is over any quadrant first
    const quadrants = document.querySelectorAll('.quadrant');
    let targetQuadrant = null;

    // get blur from the current style
    const blur = getComputedStyle(document.documentElement).getPropertyValue('--card-blur');

    
    quadrants.forEach(quadrant => {
        const rect = quadrant.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right &&
            e.clientY >= rect.top && e.clientY <= rect.bottom) {
            targetQuadrant = quadrant.id.split('-')[1];
        }
    });

    if (targetQuadrant !== null) {
        const quadrantId = parseInt(targetQuadrant);
        // If we're dragging from a quadrant and dropping in the same one, do nothing
        if (appState.draggedFromQuadrant !== null && quadrantId === appState.draggedFromQuadrant) {
            // Do nothing
        } else if (!appState.quadrants[quadrantId].app) {
            // Check if app is already open in another quadrant
            const currentQuadrantId = appState.quadrants.findIndex(q => q.app === appState.draggedApp);
            // If quadrant is empty, move the app there
            if (currentQuadrantId !== -1) {
                animateAppMove(appState.draggedApp, currentQuadrantId, quadrantId);
            } else {
                animateAppOpen(appState.draggedApp, quadrantId);
            }
        } else {
            // Target quadrant has an app - swap them
            const targetApp = appState.quadrants[quadrantId].app;
            const currentQuadrantId = appState.quadrants.findIndex(q => q.app === appState.draggedApp);
            if (appState.draggedApp == targetApp) {

            } else if (currentQuadrantId !== -1) {
                // Both apps are in quadrants - swap them
                animateAppSwap(appState.draggedApp, currentQuadrantId, targetApp, quadrantId);
            } else {
                // Dragged app is from taskbar - replace target app
                const app = document.getElementById(`app-${appState.draggedApp}`);
                const targetAppEl = document.getElementById(`app-${targetApp}`);
                const quadrantEl = document.getElementById(`quadrant-${quadrantId}`);
                const taskbarIcon = document.querySelector(`[data-app="${appState.draggedApp}"]`);
                const iconRect = taskbarIcon.getBoundingClientRect();
                const quadrantRect = quadrantEl.getBoundingClientRect();

                // First create the closing animation clone
                const closeClone = targetAppEl.cloneNode(true);
                closeClone.style.position = 'fixed';
                closeClone.style.top = quadrantRect.top + 'px';
                closeClone.style.left = quadrantRect.left + 'px';
                closeClone.style.width = quadrantRect.width + 'px';
                closeClone.style.height = quadrantRect.height + 'px';
                closeClone.style.margin = '0';
                closeClone.style.padding = '0';
                closeClone.style.transition = 'all 0.3s ease-in';
                closeClone.style.zIndex = '1000';
                closeClone.style.boxSizing = 'border-box';
                closeClone.style.display = 'flex';
                closeClone.classList.add('animating');
                if (targetApp === 'terminal') {
                    requestAnimationFrame(() => scrollTerminalToBottom(closeClone));
                } else if (targetApp === 'browser') {
                    requestAnimationFrame(() => scrollChatToBottom(closeClone));
                }
                document.body.appendChild(closeClone);

                // Create the opening animation clone
                const openClone = app.cloneNode(true);
                const originalStyle = app.getAttribute('style');
                app.removeAttribute('style');
                openClone.style.position = 'fixed';
                openClone.style.top = iconRect.top + 'px';
                openClone.style.left = iconRect.left + 'px';
                openClone.style.width = '40px';
                openClone.style.height = '40px';
                openClone.style.margin = '0';
                openClone.style.padding = '0';
                openClone.style.transition = 'all 0.3s ease-out';
                openClone.style.backdropFilter = `blur(${blur})`;
                openClone.style.webkitBackdropFilter = `blur(${blur})`;
                openClone.style.zIndex = '999';
                openClone.style.opacity = '0.1';
                openClone.style.transform = 'scale(0.1)';
                openClone.style.boxSizing = 'border-box';
                openClone.style.display = 'flex';
                openClone.classList.add('animating');
                if (appState.draggedApp === 'terminal') {
                    requestAnimationFrame(() => scrollTerminalToBottom(openClone));
                } else if (appState.draggedApp === 'browser') {
                    requestAnimationFrame(() => scrollChatToBottom(openClone));
                }
                document.body.appendChild(openClone);

                // Restore original app style
                if (originalStyle) {
                    app.setAttribute('style', originalStyle);
                } else {
                    app.style.display = 'none';
                }

                // Move original apps to templates and hide them
                document.getElementById('app-templates').appendChild(targetAppEl);
                document.getElementById('app-templates').appendChild(app);
                targetAppEl.style.display = 'none';
                app.style.display = 'none';

                // Update state immediately to prevent race conditions
                appState.quadrants[quadrantId].app = appState.draggedApp;

                // Start close animation
                requestAnimationFrame(() => {
                    const taskbarIconTarget = document.querySelector(`[data-app="${targetApp}"]`);
                    const iconRectTarget = taskbarIconTarget.getBoundingClientRect();
                    const translateX = iconRectTarget.left + (iconRectTarget.width / 2) - (quadrantRect.left + quadrantRect.width / 2);
                    const translateY = iconRectTarget.top + (iconRectTarget.height / 2) - (quadrantRect.top + quadrantRect.height / 2);
                    closeClone.style.transform = `translate(${translateX}px, ${translateY}px) scale(0.1)`;
                    closeClone.style.opacity = '0';

                    // Start open animation slightly delayed
                    setTimeout(() => {
                        openClone.style.transform = 'scale(1)';
                        openClone.style.width = quadrantRect.width + 'px';
                        openClone.style.height = quadrantRect.height + 'px';
                        openClone.style.top = quadrantRect.top + 'px';
                        openClone.style.left = quadrantRect.left + 'px';
                        openClone.style.opacity = '1';
                    }, 150);
                });

                // Cleanup and render after animations
                setTimeout(() => {
                    closeClone.remove();
                    openClone.remove();
                    renderApps();
                }, 450);
            }
        }
    } else {
        // Check if mouse is over taskbar
        const taskbar = document.querySelector('.taskbar');
        const taskbarRect = taskbar.getBoundingClientRect();
        const isOverTaskbar = e.clientY >= taskbarRect.top;

        // If we're dragging from a quadrant and not dropping on taskbar or another quadrant, close the app
        if (appState.draggedFromQuadrant !== null) {
            closeApp(appState.draggedApp);
        } else if (isOverTaskbar) {
            // Handle taskbar icon behavior
            const taskbarIcons = document.querySelectorAll('.taskbar-icon');
            let isOverIcon = false;
            
            taskbarIcons.forEach(icon => {
                const rect = icon.getBoundingClientRect();
                if (e.clientX >= rect.left && e.clientX <= rect.right &&
                    e.clientY >= rect.top && e.clientY <= rect.bottom) {
                    isOverIcon = true;
                    const appId = icon.getAttribute('data-app');
                    const currentQuadrant = appState.quadrants.findIndex(q => q.app === appId);

                    if (currentQuadrant !== -1) {
                        closeApp(appId);
                    } else {
                        const emptyQuadrant = appState.quadrants.findIndex(q => q.app === null);
                        if (emptyQuadrant !== -1) {
                            // Check if the dragged app is already open somewhere
                            const draggedAppQuadrant = appState.quadrants.findIndex(q => q.app === appState.draggedApp);
                            if (draggedAppQuadrant !== -1) {
                                animateAppMove(appState.draggedApp, draggedAppQuadrant, emptyQuadrant);
                            } else {
                                animateAppOpen(appState.draggedApp, emptyQuadrant);
                            }
                        }
                    }
                }
            });

            // If over taskbar but not over any icon, and dragging from a quadrant, close the app
            if (!isOverIcon && appState.draggedFromQuadrant !== null) {
                closeApp(appState.draggedApp);
            }
        }
    }

    // Cleanup
    const icon = document.querySelector(`[data-app="${appState.draggedApp}"]`);
    icon.classList.remove('dragging');
    const card = document.getElementById(`app-${appState.draggedApp}`);
    if (card) {
        card.classList.remove('dragging');
    }

    document.querySelectorAll('.quadrant').forEach(quadrant => {
        quadrant.classList.remove('selectable');
    });

    appState.isDragging = false;
    appState.draggedApp = null;
    appState.draggedFromQuadrant = null;
    document.removeEventListener('mouseup', stopAppDrag);
}

function openApp(quadrantId) {
    if (!appState.isDragging || !appState.draggedApp) {
        return;
    }

    // Check if quadrant is empty
    const quadrantState = appState.quadrants[quadrantId];
    if (quadrantState.app) {
        return;
    }

    // Check if app is already open in another quadrant
    const currentQuadrantId = appState.quadrants.findIndex(q => q.app === appState.draggedApp);
    const draggedApp = appState.draggedApp;

    // Cleanup drag state
    const icon = document.querySelector(`[data-app="${draggedApp}"]`);
    icon.classList.remove('dragging');
    const card = document.getElementById(`app-${draggedApp}`);
    if (card) {
        card.classList.remove('dragging');
    }

    document.querySelectorAll('.quadrant').forEach(quadrant => {
        quadrant.classList.remove('selectable');
    });

    // Remove global mouse up listener
    document.removeEventListener('mouseup', stopAppDrag);

    // If app is being moved between quadrants, use move animation
    if (currentQuadrantId !== -1) {
        animateAppMove(draggedApp, currentQuadrantId, quadrantId);
    } else {
        // Otherwise use standard open animation
        animateAppOpen(draggedApp, quadrantId);
    }

    // Clear dragging state after animation is started
    appState.isDragging = false;
    appState.draggedApp = null;
    appState.draggedFromQuadrant = null;
}

// Function to update taskbar icon borders
function updateTaskbarIconBorders() {
    document.querySelectorAll('.taskbar-icon').forEach(icon => {
        const appId = icon.getAttribute('data-app');
        const isOpen = appState.quadrants.some(q => q.app === appId);
        
        if (isOpen) {
            icon.style.boxSizing = 'border-box';
            icon.style.border = `2px solid rgba(var(--accent-rgb), 0.5)`;
            icon.style.padding = '2px';
        } else {
            icon.style.border = 'none';
            icon.style.padding = '0';
        }
    });
}

function renderApps() {
    // First, ensure all apps are back in the templates container
    document.querySelectorAll('.quadrant-card').forEach(app => {
        if (app.parentElement.id !== 'app-templates') {
            document.getElementById('app-templates').appendChild(app);
            app.style.display = 'none';
        }
    });

    // Then render apps to their quadrants
    appState.quadrants.forEach(quadrant => {
        const quadrantEl = document.getElementById(`quadrant-${quadrant.id}`);
        
        // Remove any existing content
        while (quadrantEl.firstChild) {
            quadrantEl.removeChild(quadrantEl.firstChild);
        }
        
        if (quadrant.app) {
            const app = document.getElementById(`app-${quadrant.app}`);
            if (app) {
                app.style.display = 'flex';
                quadrantEl.appendChild(app);

                // If this is a terminal app, scroll its output to bottom
                if (quadrant.app === 'terminal') {
                    // Use requestAnimationFrame to ensure DOM is updated first
                    requestAnimationFrame(() => {
                        scrollTerminalToBottom(app);
                    });
                } else if (quadrant.app === 'chatbot') {
                    requestAnimationFrame(() => {
                        scrollChatToBottom(app);
                    });
                }
            } else {
                quadrant.app = null;
            }
        }
    });

    // Update taskbar icon borders
    updateTaskbarIconBorders();
}

function closeApp(appId) {
    const actualQuadrantId = appState.quadrants.findIndex(q => q.app === appId);
    if (actualQuadrantId === -1) return;

    const quadrant = document.getElementById(`quadrant-${actualQuadrantId}`);
    const app = document.getElementById(`app-${appId}`);
    const taskbarIcon = document.querySelector(`[data-app="${appId}"]`);
    const iconRect = taskbarIcon.getBoundingClientRect();
    const cardRect = app.getBoundingClientRect();

    // Account for scroll and any body margin
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // get blur from the current style
    const blur = getComputedStyle(document.documentElement).getPropertyValue('--card-blur');

    // Create a clone for the animation
    const clone = app.cloneNode(true);
    clone.style.position = 'fixed';
    clone.style.top = (cardRect.top) + 'px';
    clone.style.left = (cardRect.left) + 'px';
    clone.style.width = cardRect.width + 'px';
    clone.style.height = cardRect.height + 'px';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backdropFilter = `blur(${blur})`;
    clone.style.webkitBackdropFilter = `blur(${blur})`;
    clone.style.transition = 'all 0.3s ease-in';

    clone.style.zIndex = '1000';
    clone.style.boxSizing = 'border-box';
    clone.classList.add('animating');
    if (appId === 'terminal') {
        requestAnimationFrame(() => scrollTerminalToBottom(clone));
    } else if (appId === 'browser') {
        requestAnimationFrame(() => scrollChatToBottom(clone));
    }
    document.body.appendChild(clone);

    // Calculate the center points for a more accurate animation
    const cardCenterX = cardRect.left + (cardRect.width / 2);
    const cardCenterY = cardRect.top + (cardRect.height / 2);
    const iconCenterX = iconRect.left + (iconRect.width / 2);
    const iconCenterY = iconRect.top + (iconRect.height / 2);

    // Start animation
    requestAnimationFrame(() => {
        clone.style.transform = `translate(${iconCenterX - cardCenterX}px, ${iconCenterY - cardCenterY}px) scale(0.1)`;
        clone.style.opacity = '0';
    });

    // Move app back to templates and hide it
    document.getElementById('app-templates').appendChild(app);
    app.style.display = 'none';
    
    // Update state
    appState.quadrants[actualQuadrantId].app = null;

    // Update taskbar icon state immediately after state update
    updateTaskbarIconBorders();

    // Clean up clone after animation
    setTimeout(() => {
        clone.remove();
    }, 300);
}

// Extract taskbar icon setup into a function
function setupTaskbarIconHandlers(icon) {
    // Set fast transition only for specific properties
    icon.style.transition = 'transform 0.08s ease-out';
    
    let dragStarted = false;
    let mouseDownTimer;

    icon.addEventListener('mousedown', (e) => {
        const appId = icon.getAttribute('data-app');
        
        // Start drag after a short delay or movement
        mouseDownTimer = setTimeout(() => {
            dragStarted = true;
            startAppDrag(appId);
        }, 200);

        // Also start drag if mouse moves while down
        const startX = e.clientX;
        const startY = e.clientY;
        
        const mouseMoveHandler = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 10 && !dragStarted) {  // 5px movement threshold
                dragStarted = true;
                clearTimeout(mouseDownTimer);
                startAppDrag(appId);
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        
        // Cleanup on mouse up
        const mouseUpHandler = () => {
            clearTimeout(mouseDownTimer);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };
        
        document.addEventListener('mouseup', mouseUpHandler);
    });

    icon.addEventListener('click', () => {
        if (dragStarted) {
            dragStarted = false;
            return;
        }

        const appId = icon.getAttribute('data-app');
        const currentQuadrant = appState.quadrants.findIndex(q => q.app === appId);

        if (currentQuadrant !== -1) {
            closeApp(appId);
        } else {
            const emptyQuadrant = appState.quadrants.findIndex(q => q.app === null);
            if (emptyQuadrant !== -1) {
                animateAppOpen(appId, emptyQuadrant);
            }
        }
    });
}

// Add drag handlers to all app cards
function setupCardDragHandlers(card) {
    // Remove any existing listeners to prevent duplicates
    // const newCard = card.cloneNode(true);
    // card.parentNode.replaceChild(newCard, card);
    // card = newCard;

    let dragStarted = false;
    let mouseDownTimer;

    card.addEventListener('mousedown', (e) => {
        // // Don't handle drag if clicking on input or pointer-enabled elements
        // if (e.target.tagName === 'INPUT' || 
        //     e.target.classList.contains('pointer-enabled') || 
        //     e.target.closest('.pointer-enabled')) {
        //     return;
        // }

        // // Only handle drag on the card header (where the close button and title are)
        // const cardHeader = e.target.closest('.card-content');
        // if (!cardHeader) return;

        // // Don't handle drag if clicking close button
        // if (e.target.closest('.close-btn')) return;

        // e.preventDefault(); // Prevent text selection
        const appId = card.id.replace('app-', '');
        const currentQuadrant = appState.quadrants.findIndex(q => q.app === appId);
        
        // Start drag after a short delay or movement
        mouseDownTimer = setTimeout(() => {
            dragStarted = true;
            startAppDrag(appId, currentQuadrant);
        }, 200);

        // Also start drag if mouse moves while down
        const startX = e.clientX;
        const startY = e.clientY;
        
        const mouseMoveHandler = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5 && !dragStarted) {  // 5px movement threshold
                dragStarted = true;
                clearTimeout(mouseDownTimer);
                startAppDrag(appId, currentQuadrant);
            }
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        
        // Cleanup on mouse up
        const mouseUpHandler = () => {
            clearTimeout(mouseDownTimer);
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
            dragStarted = false;
        };
        
        document.addEventListener('mouseup', mouseUpHandler);
    });
}

// Initial render
renderApps();

// Make both handler setup functions globally available
window.setupCardDragHandlers = setupCardDragHandlers;
window.setupTaskbarIconHandlers = setupTaskbarIconHandlers;

// Initial setup for existing taskbar icons
document.querySelectorAll('.taskbar-icon').forEach(setupTaskbarIconHandlers);

// Update click handler for connection status
document.querySelector('.connection-status').addEventListener('click', function(e) {
    document.querySelector('.bottom-container').classList.toggle('connection-active');
    e.stopPropagation();
});

// Update click handler for closing dropdown
document.addEventListener('click', function() {
    document.querySelector('.bottom-container').classList.remove('connection-active');
});