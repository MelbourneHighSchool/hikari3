// Define ipcRenderer globally for all scripts to use
window.ipcRenderer = require('electron').ipcRenderer;

const appRegistry = {
    apps: {},
    
    async init() {
        // Get list of app files from main process
        const appFiles = await window.ipcRenderer.invoke('get-app-files');
        // console.log('Original files:', appFiles);
        
        // Sort files by number prefix, then alphabetically
        const sortedFiles = appFiles.sort((a, b) => {
            let aNum = parseInt(a.match(/\d+/)[0]);
            let bNum = parseInt(b.match(/\d+/)[0]);
            return aNum - bNum;
        });
        
        // console.log('Sorted files:', sortedFiles);
        
        // Load each app file dynamically
        for (const file of sortedFiles) {
            if (file === 'registry.js') continue; // Skip registry itself
            // console.log('Loading:', file);
            
            const script = document.createElement('script');
            script.src = `./apps/${file}`;
            document.body.appendChild(script);

            // wait for the script to load
            await new Promise(resolve => script.onload = resolve);
        }
    },

    register(appId, config) {
        this.apps[appId] = config;
        this.createTemplate(appId, config);
        this.createTaskbarIcon(appId, config);

        if (config.setup) {
            config.setup();
        }

        if (config.style) {
            this.createStyle(appId, config);
        }
    },

    createStyle(appId, config) {
        const style = document.createElement('style');
        console.log(config.style);
        style.innerHTML = config.style;
        document.head.appendChild(style);
    },

    createTemplate(appId, config) {
        const template = document.createElement('div');
        template.id = `app-${appId}`;
        template.className = 'quadrant-card';
        template.innerHTML = config.template;
        
        document.getElementById('app-templates').appendChild(template);
        
        // Call setupCardDragHandlers if it exists
        if (typeof window.setupCardDragHandlers === 'function') {
            window.setupCardDragHandlers(template);
        }
    },

    createTaskbarIcon(appId, config) {
        const icon = document.createElement('div');
        icon.className = 'taskbar-icon';
        icon.setAttribute('data-tooltip', config.title);
        icon.setAttribute('data-app', appId);
        
        icon.innerHTML = `
            <span class="material-icons" style="color: var(--accent);" aria-hidden="true">
                ${config.icon}
            </span>
        `;
        
        document.querySelector('.taskbar').appendChild(icon);
        
        // Set up handlers for the new taskbar icon
        if (typeof window.setupTaskbarIconHandlers === 'function') {
            window.setupTaskbarIconHandlers(icon);
        }
    }
};