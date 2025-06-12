appRegistry.register('overview', {
    title: 'Overview',
    icon: 'dashboard',
    template: `
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">dashboard</span>
                        <h3>Overview</h3>
                    </div>
                    <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                        <div class="input-row">
                            <label>Robot name</label>
                            <input type="text" placeholder="Enter name">
                        </div>
                        <div class="input-row">
                            <label>Search</label>
                            <input type="search" placeholder="Search commands">
                        </div>
                        <div class="input-row">
                            <label>Robot ID</label>
                            <input type="number" placeholder="Enter ID">
                        </div>
                        <div class="input-row">
                            <label>Access code</label>
                            <input type="password" placeholder="Enter code">
                        </div>
                        <div class="input-row">
                            <label>Theme color</label>
                            <input type="color" value="#8d6fed">
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
}); 