appRegistry.register('code', {
    title: 'Code Editor',
    icon: 'code',
    template: `
        <div class="card-content">
            <style>
                /* Hide scrollbar but keep scrolling */
                .ace_scrollbar {
                    width: 0 !important;
                }
                .ace_scrollbar-inner {
                    width: 0 !important;
                }
                .ace_scroller {
                    right: 0 !important;
                }
                .ace_scrollbar::-webkit-scrollbar {
                    width: 0;
                    display: none;
                }
                /* Make editor background translucent */
                .ace-one-dark {
                    background: rgba(40, 44, 52, 0.8) !important;
                }
                .ace-one-dark .ace_gutter {
                    background: rgba(40, 44, 52, 0.6) !important;
                }
                /* Updated file tree styling */
                .file-tree {
                    padding: 0.5rem;
                    color: #abb2bf;
                    font-size: 0.8rem;
                    position: relative; /* For context menu positioning */
                    transition: background-color 0.3s ease-in, background-color 0.3s ease-out;
                }
                .file-item, .folder-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.1rem 0.5rem;
                    cursor: pointer;
                    user-select: none;
                    height: 1.1rem;
                    white-space: nowrap;
                    overflow: hidden;
                }
                .file-item:hover, .folder-header:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                .file-item.selected {
                    background: rgba(var(--accent-rgb), 0.2);
                    border-radius: 4px;
                    color: var(--accent);
                }
                .folder-contents {
                    overflow: hidden;
                    transition: height 0.2s ease-out;
                }
                .folder-contents.collapsed {
                    height: 0;
                }
                .folder-contents.expanded {
                    height: auto;
                }
                .folder-name {
                    font-weight: 600;
                    text-overflow: ellipsis;
                    overflow: hidden;
                }
                .context-menu {
                    position: fixed;
                    background: rgba(40, 44, 52, 0.7);
                    border-radius: 4px;
                    padding: 0.5rem;
                    min-width: 120px;
                    z-index: 1000;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                    color: #abb2bf;
                    font-size: 0.8rem;
                }
                .context-menu-item {
                    display: flex;
                    align-items: center;
                    padding: 0.1rem 0.5rem;
                    cursor: pointer;
                    user-select: none;
                    height: 1.1rem;
                }
                .context-menu-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                /* Add styles for inline creation input */
                .create-new-input {
                    background: rgba(var(--accent-rgb), 0.1);
                    border: none;
                    outline: none;
                    color: var(--foreground);
                    font-size: 0.8rem;
                    padding: 0.1rem 0.5rem;
                    border-radius: 4px;
                    height: 1.1rem;
                    font-family: inherit;
                    width: calc(100% - 1rem);
                }
                .create-new-input:focus {
                    background: rgba(var(--accent-rgb), 0.2);
                }
                .file-item {
                    text-overflow: ellipsis;
                    position: relative;
                }
                .unsaved-dot {
                    position: absolute;
                    right: 0.5rem;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 6px;
                    height: 6px;
                    background: white;
                    border-radius: 50%;
                    opacity: 0.7;
                }
                /* Add drag and drop styles */
                .file-item.dragging, .folder-header.dragging {
                    opacity: 0.5;
                    background: rgba(var(--accent-rgb), 0.1);
                }
                .file-item.drag-over, .folder-header.drag-over {
                    background: rgba(var(--accent-rgb), 0.15);
                    border-radius: 4px;
                }
                .folder-header.drag-over::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 2px;
                    background: var(--accent);
                }
                /* Add these new styles */
                .snapshot-list {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: rgba(40, 44, 52, 0.7);
                    border-radius: 4px;
                    max-height: 200px;
                    overflow-y: auto;
                    z-index: 100;
                    transform: translateY(100%);
                    margin: 0.5rem;
                }
                
                .snapshot-item {
                    padding: 0.3rem 0.5rem;
                    cursor: pointer;
                    user-select: none;
                    color: #abb2bf;
                    font-size: 0.8rem;
                }
                
                .snapshot-item:hover {
                    background: rgba(255, 255, 255, 0.1);
                    border-radius: 4px;
                }
                /* Update file tree container styles */
                .file-explorer {
                    flex: 0 0 30%;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    min-width: 0;
                }
                
                .file-tree {
                    flex: 1;
                    overflow-y: scroll; /* Change to scroll to enable scrolling */
                    background: rgba(40, 44, 52, 0.7);
                    border-radius: 4px;
                    min-height: 0;
                    scrollbar-width: none; /* Firefox */
                    -ms-overflow-style: none; /* IE and Edge */
                }
                
                /* Hide scrollbar for Chrome, Safari and Opera */
                .file-tree::-webkit-scrollbar {
                    display: none;
                }
                
                .snapshot-list-container {
                    height: 0;
                    overflow: hidden;
                    background: rgba(40, 44, 52, 0.7);
                    border-radius: 4px;
                    transition: height 0.3s ease;
                }
                
                .snapshot-list-container.visible {
                    height: 150px;
                    overflow-y: auto;
                    margin-top: 1rem;
                }

                /* Hide scrollbar but keep functionality */
                .snapshot-list-container::-webkit-scrollbar {
                    width: 0;
                    display: none;
                }
                
                .snapshot-list {
                    padding: 0.5rem;
                }
                
                .snapshot-list-header {
                    padding: 0.5rem;
                    font-size: 0.9rem;
                    color: #abb2bf;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                    margin-bottom: 0.5rem;
                }

                /* Make sure the main content area can shrink */
                .app-content {
                    min-height: 0;
                }
                
                .subcard {
                    min-height: 0;
                }

                .folder-header input {
                    margin-left: -0.5rem; !important
                    width: calc(100% + 2rem); !important 
                }

                .file-item input {
                    width: calc(100% - 0.5rem);
                }

                /* Update snapshot input style to match create-new-input */
                .snapshot-input {
                    margin-left: -0.5rem;
                    background: rgba(var(--accent-rgb), 0.1);
                    margin-top: -0.2rem;
                    margin-bottom: -0.2rem;
                    border: none;
                    outline: none;
                    color: var(--foreground);
                    font-size: 0.8rem;
                    padding: 0.1rem 0.5rem;
                    border-radius: 4px;
                    width: calc(100%);
                    height: 1.1rem;
                    font-family: inherit;
                }
                
                .snapshot-input:focus {
                    background: rgba(var(--accent-rgb), 0.2);
                }

                /* Update the folder-header style to include the icon alignment */
                .folder-header {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.1rem 0.5rem;
                    padding-top: 0.1rem;

                    padding-left: 0.5rem;
                    padding-right: 0;
                    cursor: pointer;
                    user-select: none;
                    height: 1.1rem;
                    white-space: nowrap;
                    overflow: hidden;
                    position: relative;
                }

                .folder-contents > * {
                    padding-left: 1rem;
                }

                .folder-contents > .file-item {
                    padding-left: 0.5rem;
                }

                .folder-contents > .folder-item {
                    padding-left: 0;
                }

                /* Ensure input container follows the same rules */
                .folder-contents > div:has(> .create-new-input) {
                    padding-left: 0.5rem;
                }

                /* Add upload button styles */
                .upload-button {
                    position: absolute;
                    bottom: 0.5rem;
                    right: 0.5rem;
                    width: 1rem;
                    height: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 10;
                    opacity: 0.5;
                    border-radius: 4px;
                    background: rgba(40, 44, 52, 0.7);
                    padding: 0.3rem;
                }

                /* Only apply hover effect when not uploading */
                .upload-button:not(.uploading):hover {
                    opacity: 1;
                    background: rgba(40, 44, 52, 0.9);
                }

                /* Keep opacity at 1 during upload, but disable hover effect */
                .upload-button.uploading {
                    cursor: default;
                }

                .upload-button .material-icons {
                    font-size: 0.4rem;
                    color: var(--foreground) !important;
                    transition: color 0.3s ease !important;
                }

                .upload-button.uploading .material-icons {
                    color: var(--accent) !important;
                }

                /* Update file-explorer to handle the upload button */
                .file-explorer {
                    position: relative;
                }

                /* Add file tree upload state */
                .file-tree.uploading {
                    background: rgba(72, 76, 83, 0.7) !important;  /* Lighter version of the background */
                }
            </style>
            <div class="app-content" style="display: flex; flex-direction: column; height: 100%;">
                <div class="subcard" style="display: flex; flex-direction: column; flex: 1; min-height: 0;">
                    <div class="app-header">
                        <span class="material-icons">code</span>
                        <h3>Code Editor</h3>
                    </div>
                    <div style="display: flex; flex: 1; margin-top: 1rem; gap: 1rem; min-height: 0; overflow: hidden;">
                        <div class="file-explorer">
                            <div class="upload-button">
                                <span class="material-icons">upload</span>
                            </div>
                            <div class="file-tree">
                                <!-- File selector will be populated here -->
                            </div>
                            <div class="snapshot-list-container">
                                <!-- Snapshot list will be populated here -->
                            </div>
                        </div>
                        <div style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
                            <div class="editor-status" style="
                                height: 1.2rem;
                                font-size: 0.7rem;
                                opacity: 0.5;
                                padding: 0px 0.5rem;
                                display: none;
                                position: absolute;
                                z-index: 1000;
                                right: 0.7rem;
                                top: 3.2rem;
                            ">Unsaved</div>
                            <div id="editor" style="
                                flex: 1;
                                border-radius: 4px;
                                overflow: hidden;
                            "></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    activeSnapshotMenu: null,
    editor: null,
    currentFile: null,
    statusElement: null,
    isDocumentChanged: false,
    
    closeSnapshotMenu() {
        if (this.activeSnapshotMenu) {
            this.activeSnapshotMenu.remove();
            this.activeSnapshotMenu = null;
        }
    },

    renderFileTree(files) {
        function sortFileTree(node) {
            if (node.children) {
                // Sort children recursively
                node.children.sort((a, b) => {
                    // Folders come before files
                    if (a.type !== b.type) {
                        return a.type === 'folder' ? -1 : 1;
                    }
                    // Within same type, sort alphabetically
                    return a.name.localeCompare(b.name);
                });
                
                // Sort children's children
                node.children.forEach(child => {
                    if (child.type === 'folder') {
                        sortFileTree(child);
                    }
                });
            }
            return node;
        }

        function renderNode(node) {
            if (node.type === 'file') {
                return `
                    <div class="file-item" draggable="true">
                        ${node.name}
                        <div class="unsaved-dot" style="display: none;"></div>
                    </div>
                `;
            } else if (node.type === 'folder') {
                const childrenHtml = node.children
                    .map(child => renderNode(child))
                    .join('');
                    
                return `
                    <div class="folder-item">
                        <div class="folder-header" draggable="true">
                            <span class="folder-name">${node.name}/</span>
                        </div>
                        <div class="folder-contents" style="padding-left: 1rem;">
                            ${childrenHtml}
                        </div>
                    </div>
                `;
            }
            return '';
        }

        return renderNode(sortFileTree(files));
    },
    async loadFileTree() {
        try {
            const files = await window.ipcRenderer.invoke('get-core-files');
            const fileTree = document.querySelector('.file-tree');
            if (fileTree) {
                fileTree.innerHTML = this.renderFileTree(files);
                
                // After rendering, check for unsaved files and show dots
                fileTree.querySelectorAll('.file-item').forEach(item => {
                    // Build the full path by traversing up the tree
                    let path = [];
                    let current = item;
                    while (current && !current.classList.contains('file-tree')) {
                        if (current.classList.contains('folder-item')) {
                            path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                        } else if (current.classList.contains('file-item')) {
                            path.unshift(current.textContent.trim());
                        }
                        current = current.parentElement;
                    }
                    const filePath = path.join('/');
                    
                    // Check if this file has unsaved changes
                    const dot = item.querySelector('.unsaved-dot');
                    if (window.unsavedFileContent && window.unsavedFileContent[filePath]) {
                        dot.style.display = 'block';
                        item.setAttribute('draggable', 'false'); // Disable dragging for unsaved files
                    } else {
                        dot.style.display = 'none';
                        item.setAttribute('draggable', 'true');
                    }
                });

                // Collapse __pycache__ folders by default
                fileTree.querySelectorAll('.folder-item').forEach(folder => {
                    const folderName = folder.querySelector('.folder-name').textContent.replace('/', '');
                    if (folderName === '__pycache__') {
                        folder.querySelector('.folder-contents').style.display = 'none';
                    }
                });
            }
        } catch (error) {
            console.error('Error loading file tree:', error);
        }
    },
    async loadFile(filename) {
        try {
            // Store unsaved changes of current file if any
            if (this.currentFile && this.isDocumentChanged) {
                window.unsavedFileContent[this.currentFile] = this.editor.session.getValue();
            }

            // Update file selection in tree
            const fileTree = document.querySelector('.file-tree');
            fileTree.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
                if (item.textContent.trim() === filename.split('/').pop()) {
                    item.classList.add('selected');
                }
            });

            // Load content from unsaved storage if it exists, otherwise load from file
            if (window.unsavedFileContent.hasOwnProperty(filename)) {
                this.currentFile = filename;
                this.editor.session.setValue(window.unsavedFileContent[filename]);
                editor.setReadOnly(false);
                this.isDocumentChanged = true;
                this.statusElement.style.display = 'block';
            } else {
                await originalLoadFile(filename);
                editor.setReadOnly(false);
                this.isDocumentChanged = false;
                this.statusElement.style.display = 'none';
            }

            // Update all dots based on unsaved content
            fileTree.querySelectorAll('.file-item').forEach(item => {
                // Build full path for each file
                let path = [];
                let current = item;
                while (current && !current.classList.contains('file-tree')) {
                    if (current.classList.contains('folder-item')) {
                        path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                    } else if (current.classList.contains('file-item')) {
                        path.unshift(current.textContent.trim());
                    }
                    current = current.parentElement;
                }
                const itemPath = path.join('/');
                
                // Update dot visibility based on unsaved content
                const dot = item.querySelector('.unsaved-dot');
                if (window.unsavedFileContent.hasOwnProperty(itemPath)) {
                    dot.style.display = 'block';
                    item.setAttribute('draggable', 'false'); // Disable dragging for unsaved files
                } else {
                    dot.style.display = 'none';
                    item.setAttribute('draggable', 'true'); // Re-enable dragging for saved files
                }
            });
        } catch (error) {
            console.error('Error loading file:', error);
        }
    },
    async saveCurrentFile() {
        if (!this.currentFile) return;
        
        try {
            const content = this.editor.session.getValue();
            await window.ipcRenderer.invoke('save-core-file', {
                filename: this.currentFile,
                content: content
            });
            
            // Clear from unsaved storage
            delete window.unsavedFileContent[this.currentFile];
            
            // Update the dot visibility and draggable state
            const fileTree = document.querySelector('.file-tree');
            fileTree.querySelectorAll('.file-item').forEach(item => {
                // Build full path for this item
                let path = [];
                let current = item;
                while (current && !current.classList.contains('file-tree')) {
                    if (current.classList.contains('folder-item')) {
                        path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                    } else if (current.classList.contains('file-item')) {
                        path.unshift(current.textContent.trim());
                    }
                    current = current.parentElement;
                }
                const itemPath = path.join('/');
                
                // If this is the saved file, update its dot and draggable state
                if (itemPath === this.currentFile) {
                    const dot = item.querySelector('.unsaved-dot');
                    dot.style.display = 'none';
                    item.setAttribute('draggable', 'true');
                }
            });
            
            // Reset document changed state and status
            this.isDocumentChanged = false;
            if (this.statusElement) {
                this.statusElement.style.display = 'none';
            }
        } catch (error) {
            console.error('Error saving file:', error);
            throw error;
        }
    },
    setup: async function() {
        // Initialize global unsaved content storage
        window.unsavedFileContent = {};

        // Add these here
        let activeSnapshotMenu = null;
        
        const closeSnapshotMenu = () => {
            if (activeSnapshotMenu) {
                activeSnapshotMenu.remove();
                activeSnapshotMenu = null;
            }
        };

        // Load Ace editor dynamically
        await import('../ace.js');
        await import('../mode-python.js');
        await import('../theme-one_dark.js');
        
        // Set base path for Ace
        ace.config.set('basePath', '../');
        
        // Initialize Ace editor
        const editor = ace.edit("editor");
        editor.setTheme("ace/theme/one_dark");
        editor.session.setMode("ace/mode/python");
        
        // Set some default options
        editor.setShowPrintMargin(false);
        editor.setHighlightActiveLine(true);
        editor.session.setUseWrapMode(true);
        editor.session.setWrapLimitRange(null, null);
        
        // Set initial state to read-only with placeholder
        editor.setReadOnly(true);
        editor.session.setValue('Select a file to edit');

        // Store editor instance for later access
        this.editor = editor;

        // Initialize status element
        this.statusElement = document.querySelector('.editor-status');
        this.isDocumentChanged = false;

        // Store original methods BEFORE redefining them
        const originalLoadFile = async (filename) => {
            const content = await window.ipcRenderer.invoke('get-core-file', filename);
            this.editor.session.setValue(content);
            this.currentFile = filename;
        };
        
        const originalSaveFile = this.saveCurrentFile;

        // Now redefine loadFile with access to originalLoadFile
        this.loadFile = async function(filename) {
            try {
                // Store unsaved changes of current file if any
                if (this.currentFile && this.isDocumentChanged) {
                    window.unsavedFileContent[this.currentFile] = this.editor.session.getValue();
                }

                // Update file selection in tree
                const fileTree = document.querySelector('.file-tree');
                fileTree.querySelectorAll('.file-item').forEach(item => {
                    item.classList.remove('selected');
                    if (item.textContent.trim() === filename.split('/').pop()) {
                        item.classList.add('selected');
                    }
                });

                // Load content from unsaved storage if it exists, otherwise load from file
                if (window.unsavedFileContent.hasOwnProperty(filename)) {
                    this.currentFile = filename;
                    this.editor.session.setValue(window.unsavedFileContent[filename]);
                    editor.setReadOnly(false);
                    this.isDocumentChanged = true;
                    this.statusElement.style.display = 'block';
                } else {
                    await originalLoadFile(filename);
                    editor.setReadOnly(false);
                    this.isDocumentChanged = false;
                    this.statusElement.style.display = 'none';
                }

                // Update all dots based on unsaved content
                fileTree.querySelectorAll('.file-item').forEach(item => {
                    // Build full path for each file
                    let path = [];
                    let current = item;
                    while (current && !current.classList.contains('file-tree')) {
                        if (current.classList.contains('folder-item')) {
                            path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                        } else if (current.classList.contains('file-item')) {
                            path.unshift(current.textContent.trim());
                        }
                        current = current.parentElement;
                    }
                    const itemPath = path.join('/');
                    
                    // Update dot visibility based on unsaved content
                    const dot = item.querySelector('.unsaved-dot');
                    if (window.unsavedFileContent.hasOwnProperty(itemPath)) {
                        dot.style.display = 'block';
                        item.setAttribute('draggable', 'false'); // Disable dragging for unsaved files
                    } else {
                        dot.style.display = 'none';
                        item.setAttribute('draggable', 'true'); // Re-enable dragging for saved files
                    }
                });
            } catch (error) {
                console.error('Error loading file:', error);
            }
        }.bind(this);

        editor.session.on('change', () => {
            if (!this.isDocumentChanged && this.currentFile) {
                const currentContent = this.editor.session.getValue();
                // Only mark as changed if content is actually different from saved/loaded content
                if (window.unsavedFileContent[this.currentFile] !== currentContent) {
                    this.isDocumentChanged = true;
                    this.statusElement.style.display = 'block';
                    // Update dot in file tree and disable dragging
                    const filename = this.currentFile.split('/').pop();
                    const fileItems = document.querySelectorAll('.file-item');
                    fileItems.forEach(item => {
                        if (item.textContent.trim() === filename) {
                            item.querySelector('.unsaved-dot').style.display = 'block';
                            item.setAttribute('draggable', 'false');  // Disable dragging when file becomes unsaved
                        }
                    });
                }
            }
        });

        // Add Ctrl+S handler
        document.addEventListener('keydown', async (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (this.currentFile) {
                    try {
                        await this.saveCurrentFile();
                    } catch (error) {
                        console.error('Error saving file:', error);
                    }
                }
            }
        });

        // Load the actual file tree instead of sample data
        await this.loadFileTree();

        const fileTree = document.querySelector('.file-tree');
        if (fileTree) {
            // Add context menu
            let activeContextMenu = null;
            let currentFolderPath = null;

            const closeContextMenu = () => {
                if (activeContextMenu) {
                    activeContextMenu.remove();
                    activeContextMenu = null;
                }
            };

            // Close context menu when clicking outside
            document.addEventListener('click', closeContextMenu);

            // Prevent context menu on right click and show our custom menu
            fileTree.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                const folderHeader = e.target.closest('.folder-header');
                const fileItem = e.target.closest('.file-item');
                
                if (folderHeader || fileItem) {
                    closeContextMenu();
                    
                    // Get item path
                    let path = [];
                    let current = folderHeader || fileItem;
                    while (current && !current.classList.contains('file-tree')) {
                        if (current.classList.contains('folder-item')) {
                            path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                        } else if (current.classList.contains('file-item')) {
                            path.unshift(current.textContent.trim());
                        }
                        current = current.parentElement;
                    }
                    currentFolderPath = path.join('/');

                    // Create context menu
                    const contextMenu = document.createElement('div');
                    contextMenu.className = 'context-menu';
                    
                    if (folderHeader) {
                        contextMenu.innerHTML = `
                            <div class="context-menu-item" data-action="new-file">
                                New File
                            </div>
                            <div class="context-menu-item" data-action="new-folder">
                                New Folder
                            </div>
                            <div class="context-menu-item" data-action="rename">
                                Rename
                            </div>
                            <div class="context-menu-item" data-action="duplicate">
                                Duplicate
                            </div>
                            <div class="context-menu-item" data-action="delete">
                                Delete
                            </div>
                            ${currentFolderPath === 'core' ? `
                            <div class="context-menu-item" data-action="snapshot">
                                Create Snapshot
                            </div>
                            <div class="context-menu-item" data-action="restore-snapshot">
                                Restore Snapshot
                            </div>
                            <div class="context-menu-item" data-action="refresh">
                                Refresh
                            </div>
                            ` : ''}
                        `;
                    } else {
                        contextMenu.innerHTML = `
                            <div class="context-menu-item" data-action="rename">
                                Rename
                            </div>
                            <div class="context-menu-item" data-action="duplicate">
                                Duplicate
                            </div>
                            <div class="context-menu-item" data-action="revert">
                                Revert
                            </div>
                            <div class="context-menu-item" data-action="delete">
                                Delete
                            </div>
                        `;
                    }
                    
                    // Position the menu
                    contextMenu.style.left = e.pageX + 'px';
                    contextMenu.style.top = e.pageY + 'px';
                    
                    // Add click handlers
                    contextMenu.addEventListener('click', async (e) => {
                        const menuItem = e.target.closest('.context-menu-item');
                        if (!menuItem) return;
                        closeContextMenu();

                        const action = menuItem.dataset.action;
                        
                        if (action === 'rename') {
                            const itemElement = folderHeader || fileItem;
                            const nameElement = folderHeader ? 
                                itemElement.querySelector('.folder-name') : 
                                itemElement;
                            const originalName = folderHeader ? 
                                nameElement.textContent.replace('/', '') : 
                                nameElement.textContent.trim();
                            
                            // Create inline input for renaming
                            const input = document.createElement('input');
                            input.className = 'create-new-input';
                            input.value = originalName;
                            input.style.width = 'calc(100% - 1rem)';
                            
                            // Replace the name with input
                            nameElement.style.display = 'none';
                            nameElement.parentNode.insertBefore(input, nameElement);
                            input.focus();
                            input.select();

                            let isHandling = false;

                            const handleRename = async () => {
                                if (isHandling) return;
                                isHandling = true;

                                const newName = input.value.trim();
                                if (newName && newName !== originalName) {
                                    try {
                                        await window.ipcRenderer.invoke('rename-core-item', {
                                            path: currentFolderPath,
                                            newName: newName
                                        });
                                        await this.loadFileTree();
                                    } catch (error) {
                                        console.error('Error renaming item:', error);
                                        // Restore original name on error
                                        nameElement.style.display = '';
                                        input.remove();
                                    }
                                } else {
                                    // Restore original name if unchanged
                                    nameElement.style.display = '';
                                    input.remove();
                                }
                            };

                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleRename();
                                } else if (e.key === 'Escape') {
                                    nameElement.style.display = '';
                                    input.remove();
                                }
                            });

                            input.addEventListener('blur', handleRename);
                        } else if (action === 'duplicate') {
                            try {
                                await window.ipcRenderer.invoke('duplicate-core-item', {
                                    path: currentFolderPath
                                });
                                await this.loadFileTree();
                            } catch (error) {
                                console.error('Error duplicating item:', error);
                            }
                        } else if (action === 'delete') {
                            try {
                                await window.ipcRenderer.invoke('delete-core-item', {
                                    path: currentFolderPath
                                });
                                await this.loadFileTree();
                            } catch (error) {
                                console.error('Error deleting item:', error);
                            }
                        } else if (action === 'revert') {
                            try {
                                // Remove from unsaved content
                                delete window.unsavedFileContent[currentFolderPath];
                                
                                // If this is the current file, reload it from disk
                                if (this.currentFile === currentFolderPath) {
                                    await originalLoadFile.call(this, currentFolderPath);
                                    editor.setReadOnly(false);
                                    this.isDocumentChanged = false;
                                    this.statusElement.style.display = 'none';
                                }

                                // Clear the unsaved dot
                                const filename = currentFolderPath.split('/').pop();
                                const fileItems = document.querySelectorAll('.file-item');
                                fileItems.forEach(item => {
                                    if (item.textContent.trim() === filename) {
                                        item.querySelector('.unsaved-dot').style.display = 'none';
                                    }
                                });
                            } catch (error) {
                                console.error('Error reverting file:', error);
                            }
                        } else if (action === 'snapshot') {
                            const inputContainer = document.createElement('div');
                            inputContainer.className = 'file-item';
                            inputContainer.style.paddingLeft = '0';
                            inputContainer.style.marginLeft = '0';
                            
                            const input = document.createElement('input');
                            input.className = 'create-new-input';
                            input.placeholder = 'Snapshot name';
                            
                            inputContainer.appendChild(input);
                            
                            const folderContents = folderHeader.parentElement.querySelector('.folder-contents');
                            if (folderContents.firstChild) {
                                folderContents.insertBefore(inputContainer, folderContents.firstChild);
                            } else {
                                folderContents.appendChild(inputContainer);
                            }
                            input.focus();

                            let isHandling = false;

                            const handleSnapshot = async () => {
                                if (isHandling) return;
                                isHandling = true;

                                const name = input.value.trim();
                                if (name) {
                                    try {
                                        await window.ipcRenderer.invoke('create-core-snapshot', { name });
                                        await this.loadFileTree();
                                    } catch (error) {
                                        console.error('Error creating snapshot:', error);
                                    }
                                }
                                inputContainer.remove();
                            };

                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSnapshot();
                                } else if (e.key === 'Escape') {
                                    inputContainer.remove();
                                }
                            });

                            input.addEventListener('blur', handleSnapshot);
                        } else if (action === 'restore-snapshot') {
                            const snapshotContainer = document.querySelector('.snapshot-list-container');
                            
                            // If snapshot list is already visible, hide it
                            if (snapshotContainer.classList.contains('visible')) {
                                snapshotContainer.classList.remove('visible');
                                snapshotContainer.innerHTML = '';
                                return;
                            }

                            try {
                                // Get list of snapshots
                                const snapshots = await window.ipcRenderer.invoke('list-core-snapshots');
                                
                                // Create and show snapshot list
                                const snapshotList = document.createElement('div');
                                snapshotList.style.padding = '0.5rem';
                                
                                if (snapshots.length > 0) {
                                    snapshots.forEach(snapshot => {
                                        const item = document.createElement('div');
                                        item.className = 'snapshot-item';
                                        const displayName = snapshot.split('-').slice(1).join('-');
                                        item.textContent = displayName;
                                        item.setAttribute('data-full-name', snapshot);
                                        
                                        // Add right-click handler for snapshot context menu
                                        item.addEventListener('contextmenu', (e) => {
                                            e.preventDefault();
                                            
                                            // Close any existing menus first
                                            this.closeSnapshotMenu();
                                            
                                            const contextMenu = document.createElement('div');
                                            contextMenu.className = 'context-menu';
                                            contextMenu.innerHTML = `
                                                <div class="context-menu-item" data-action="rename">
                                                    Rename
                                                </div>
                                                <div class="context-menu-item" data-action="delete">
                                                    Delete
                                                </div>
                                            `;
                                            
                                            // Position the menu
                                            contextMenu.style.left = e.pageX + 'px';
                                            contextMenu.style.top = e.pageY + 'px';
                                            document.body.appendChild(contextMenu);
                                            this.activeSnapshotMenu = contextMenu;
                                            
                                            // Handle menu item clicks
                                            contextMenu.addEventListener('click', async (e) => {
                                                const menuItem = e.target.closest('.context-menu-item');
                                                if (!menuItem) return;
                                                
                                                const action = menuItem.dataset.action;
                                                const fullName = item.getAttribute('data-full-name');
                                                const currentDisplayName = item.textContent;
                                                
                                                if (action === 'rename') {
                                                    const input = document.createElement('input');
                                                    input.className = 'snapshot-input';
                                                    input.value = currentDisplayName;
                                                    
                                                    // Replace text with input
                                                    item.textContent = '';
                                                    item.appendChild(input);
                                                    input.focus();
                                                    input.select();
                                                    
                                                    let isHandlingRename = false;  // Add this flag
                                                    
                                                    const handleRename = async () => {
                                                        if (isHandlingRename) return;  // Prevent double execution
                                                        isHandlingRename = true;
                                                        
                                                        const newName = input.value.trim();
                                                        if (newName && newName !== currentDisplayName) {
                                                            try {
                                                                // Get timestamp from current full name
                                                                const timestamp = fullName.split('-')[0];
                                                                const newFullName = `${timestamp}-${newName}`;
                                                                
                                                                await window.ipcRenderer.invoke('rename-core-snapshot', {
                                                                    oldName: fullName,
                                                                    newName: newName
                                                                });
                                                                
                                                                // Update the item's display and data
                                                                item.textContent = newName;
                                                                item.setAttribute('data-full-name', newFullName);
                                                                item.classList.remove('selected');
                                                            } catch (error) {
                                                                console.error('Error renaming snapshot:', error);
                                                                item.textContent = currentDisplayName;
                                                            }
                                                        } else {
                                                            item.textContent = currentDisplayName;
                                                        }
                                                        isHandlingRename = false; // Reset the flag
                                                    };
                                                    
                                                    input.addEventListener('keydown', (e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleRename();
                                                        } else if (e.key === 'Escape') {
                                                            item.textContent = currentDisplayName;
                                                            isHandlingRename = false; // Reset the flag
                                                        }
                                                    });
                                                    
                                                    input.addEventListener('blur', handleRename);
                                                } else if (action === 'delete') {
                                                    try {
                                                        await window.ipcRenderer.invoke('delete-core-snapshot', { name: fullName });
                                                        item.remove();
                                                        if (snapshotList.children.length === 0) {
                                                            const emptyMessage = document.createElement('div');
                                                            emptyMessage.className = 'snapshot-item';
                                                            emptyMessage.style.opacity = '0.5';
                                                            emptyMessage.textContent = 'No snapshots available';
                                                            snapshotList.appendChild(emptyMessage);
                                                        }
                                                    } catch (error) {
                                                        console.error('Error deleting snapshot:', error);
                                                    }
                                                }
                                                
                                                contextMenu.remove();
                                            });
                                            
                                            // Close menu when clicking outside
                                            const closeHandler = (e) => {
                                                if (!contextMenu.contains(e.target)) {
                                                    this.closeSnapshotMenu();
                                                    document.removeEventListener('click', closeHandler);
                                                }
                                            };
                                            setTimeout(() => document.addEventListener('click', closeHandler), 0);
                                        });
                                        
                                        // Existing click handler for restoration
                                        item.addEventListener('click', async () => {
                                            try {
                                                await window.ipcRenderer.invoke('restore-core-snapshot', { name: snapshot });
                                                await this.loadFileTree();
                                                snapshotContainer.classList.remove('visible');
                                                snapshotContainer.innerHTML = '';
                                                
                                                // Automatically upload after restoring snapshot
                                                await uploadCore();
                                            } catch (error) {
                                                console.error('Error restoring snapshot:', error);
                                            }
                                        });
                                        
                                        snapshotList.appendChild(item);
                                    });
                                } else {
                                    // Add a message when no snapshots exist
                                    const emptyMessage = document.createElement('div');
                                    emptyMessage.className = 'snapshot-item';
                                    emptyMessage.style.opacity = '0.5';
                                    emptyMessage.textContent = 'No snapshots available';
                                    snapshotList.appendChild(emptyMessage);
                                }

                                // Clear and populate the snapshot container
                                snapshotContainer.innerHTML = '';
                                snapshotContainer.appendChild(snapshotList);
                                snapshotContainer.classList.add('visible');

                                // Click outside to close
                                const closeHandler = (e) => {
                                    if (!snapshotContainer.contains(e.target) && 
                                        !e.target.closest('.context-menu')) {
                                        snapshotContainer.classList.remove('visible');
                                        setTimeout(() => {
                                            snapshotContainer.innerHTML = '';
                                        }, 300); // Match transition duration
                                        document.removeEventListener('click', closeHandler);
                                    }
                                };
                                
                                // Delay adding the click handler to prevent immediate triggering
                                setTimeout(() => {
                                    document.addEventListener('click', closeHandler);
                                }, 0);

                            } catch (error) {
                                console.error('Error listing snapshots:', error);
                            }
                        } else if (action === 'refresh') {
                            try {
                                await this.loadFileTree();
                            } catch (error) {
                                console.error('Error refreshing file tree:', error);
                            }
                        } else {
                            // Handle new file/folder actions
                            const inputContainer = document.createElement('div');
                            inputContainer.className = 'file-item';
                            inputContainer.style.paddingLeft = '0';
                            inputContainer.style.marginLeft = '0';
                            
                            const input = document.createElement('input');
                            input.className = 'create-new-input';
                            input.placeholder = action === 'new-file' ? 'New file name' : 'New folder name';
                            
                            inputContainer.appendChild(input);
                            
                            // Make sure folderContents exists and is expanded
                            const folderContents = folderHeader.parentElement.querySelector('.folder-contents');
                            if (folderContents.classList.contains('collapsed')) {
                                folderContents.classList.remove('collapsed');
                                folderContents.style.height = 'auto';
                                folderContents.classList.add('expanded');
                            }

                            console.log(folderContents.firstChild);
                            console.log(folderContents);
                            console.log(folderHeader);

                            // Insert at the beginning of folderContents
                            if (folderContents.firstChild) {
                                folderContents.insertBefore(inputContainer, folderContents.firstChild);
                            } else {
                                folderContents.appendChild(inputContainer);
                            }
                            input.focus();

                            let isHandling = false;

                            const handleCreate = async () => {
                                if (isHandling) return;
                                isHandling = true;

                                const name = input.value.trim();
                                if (name) {
                                    try {
                                        if (action === 'new-file') {
                                            await window.ipcRenderer.invoke('create-core-file', {
                                                path: currentFolderPath,
                                                name: name
                                            });
                                        } else {
                                            await window.ipcRenderer.invoke('create-core-folder', {
                                                path: currentFolderPath,
                                                name: name
                                            });
                                        }
                                        await this.loadFileTree();
                                    } catch (error) {
                                        console.error(`Error creating ${action === 'new-file' ? 'file' : 'folder'}:`, error);
                                    }
                                }
                                inputContainer.remove();
                            };

                            input.addEventListener('keydown', (e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleCreate();
                                } else if (e.key === 'Escape') {
                                    inputContainer.remove();
                                }
                            });

                            input.addEventListener('blur', handleCreate);
                        }
                    });

                    document.body.appendChild(contextMenu);
                    activeContextMenu = contextMenu;
                }
            });

            // Add click handlers for folder collapse and file selection
            fileTree.addEventListener('click', (e) => {
                const folderHeader = e.target.closest('.folder-header');
                const fileItem = e.target.closest('.file-item');
                
                if (folderHeader) {
                    const folderItem = folderHeader.parentElement;
                    const folderContents = folderItem.querySelector('.folder-contents');
                    
                    if (folderContents.classList.contains('collapsed')) {
                        // Opening folder
                        folderContents.classList.remove('collapsed');
                        const height = folderContents.scrollHeight;
                        folderContents.style.height = height + 'px';
                        // After animation completes, set height to auto
                        setTimeout(() => {
                            folderContents.style.height = 'auto';
                            folderContents.classList.add('expanded');
                        }, 200); // Match the transition duration
                    } else {
                        // Closing folder
                        folderContents.classList.remove('expanded');
                        folderContents.style.height = folderContents.scrollHeight + 'px';
                        // Force a reflow
                        folderContents.offsetHeight;
                        folderContents.style.height = '0';
                        folderContents.classList.add('collapsed');
                    }
                } else if (fileItem) {
                    // Get the full path by traversing up the tree
                    let path = [];
                    let current = fileItem;
                    while (current && !current.classList.contains('file-tree')) {
                        if (current.classList.contains('folder-item')) {
                            path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                        } else if (current.classList.contains('file-item')) {
                            path.unshift(current.textContent.trim());
                        }
                        current = current.parentElement;
                    }
                    const filename = path.join('/');
                    this.loadFile(filename);
                }
            });

            // Add drag and drop handlers
            fileTree.addEventListener('dragstart', (e) => {
                const fileItem = e.target.closest('.file-item');
                const folderHeader = e.target.closest('.folder-header');
                const draggable = fileItem || folderHeader;
                
                if (draggable) {
                    draggable.classList.add('dragging');
                    
                    // Get the path of the dragged item
                    let path = [];
                    let current = draggable;
                    while (current && !current.classList.contains('file-tree')) {
                        if (current.classList.contains('folder-item')) {
                            path.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                        } else if (current.classList.contains('file-item')) {
                            path.unshift(current.textContent.trim());
                        }
                        current = current.parentElement;
                    }
                    e.dataTransfer.setData('text/plain', path.join('/'));
                }
            });

            fileTree.addEventListener('dragend', (e) => {
                const dragging = fileTree.querySelector('.dragging');
                if (dragging) {
                    dragging.classList.remove('dragging');
                }
                fileTree.querySelectorAll('.drag-over').forEach(el => {
                    el.classList.remove('drag-over');
                });
            });

            fileTree.addEventListener('dragover', (e) => {
                e.preventDefault();
                const folderHeader = e.target.closest('.folder-header');
                if (folderHeader && !folderHeader.classList.contains('dragging')) {
                    fileTree.querySelectorAll('.drag-over').forEach(el => {
                        el.classList.remove('drag-over');
                    });
                    folderHeader.classList.add('drag-over');
                }
            });

            fileTree.addEventListener('dragleave', (e) => {
                const folderHeader = e.target.closest('.folder-header');
                if (folderHeader) {
                    folderHeader.classList.remove('drag-over');
                }
            });

            fileTree.addEventListener('drop', async (e) => {
                e.preventDefault();
                const folderHeader = e.target.closest('.folder-header');
                if (!folderHeader) return;

                const sourcePath = e.dataTransfer.getData('text/plain');
                if (!sourcePath) return;

                // Get target folder path
                let targetPath = [];
                let current = folderHeader;
                while (current && !current.classList.contains('file-tree')) {
                    if (current.classList.contains('folder-item')) {
                        targetPath.unshift(current.querySelector('.folder-name').textContent.replace('/', ''));
                    }
                    current = current.parentElement;
                }
                
                try {
                    await window.ipcRenderer.invoke('move-core-item', {
                        sourcePath: sourcePath,
                        targetPath: targetPath.join('/')
                    });
                    await this.loadFileTree();
                } catch (error) {
                    console.error('Error moving item:', error);
                }
            });
        }

        // Move uploadCore outside the uploadButton handler so it can be called from anywhere
        const uploadCore = async () => {
            const uploadButton = document.querySelector('.upload-button');
            if (uploadButton?.classList.contains('uploading')) return;

            const fileTree = document.querySelector('.file-tree');
            const connectedRobots = Array.from(window.robotConnections.connected);
            if (connectedRobots.length === 0) {
                console.log('No robots connected');
                return;
            }

            const robotProfile = window.robotConnections.profiles[connectedRobots[0]];
            if (!robotProfile) {
                console.log('No robot profile found');
                return;
            }

            try {
                // Dispatch upload start event
                window.dispatchEvent(new Event('core-upload-start'));
                
                uploadButton?.classList.add('uploading');
                fileTree?.classList.add('uploading');
                await window.scpDirectory('core', robotProfile.hostname, robotProfile.username, robotProfile.identityFile);
                console.log('Core directory uploaded successfully');
                
                // Dispatch completion event
                window.dispatchEvent(new Event('core-upload-complete'));
            } catch (error) {
                console.error('Failed to upload core directory:', error);
                // Dispatch failure event
                window.dispatchEvent(new Event('core-upload-failed'));
            } finally {
                uploadButton?.classList.remove('uploading');
                fileTree?.classList.remove('uploading');
            }
        };

        // Get upload button reference
        const uploadButton = document.querySelector('.upload-button');

        // Update event handlers to also handle file tree state
        window.addEventListener('core-upload-complete', () => {
            const uploadButton = document.querySelector('.upload-button');
            uploadButton?.classList.remove('uploading');
            document.querySelector('.file-tree')?.classList.remove('uploading');
        });

        window.addEventListener('core-upload-failed', () => {
            const uploadButton = document.querySelector('.upload-button');
            uploadButton?.classList.remove('uploading');
            document.querySelector('.file-tree')?.classList.remove('uploading');
        });

        // Add click handler if button exists
        if (uploadButton) {
            uploadButton.addEventListener('click', uploadCore);

            // Add keyboard shortcut
            document.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key.toLowerCase() === 'u') {
                    e.preventDefault(); // Prevent browser's default behavior
                    uploadCore();
                }
            });
        }
    }
}); 