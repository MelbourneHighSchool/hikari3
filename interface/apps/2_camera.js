appRegistry.register('camera', {
    title: 'Camera View',
    icon: 'videocam',
    template: `
        <style>
            .camera-feeds {
                display: flex;
                padding-top: 1rem;
                padding-left: 0;
                padding-right: 0;
                justify-content: space-between;
                margin: 0 auto;
                height: calc(100% - 2.2rem - 1px);
            }

            .camera-feeds img {
                flex: 0 0 auto;
                max-width: min(100%, calc((100vh - 3.25rem - 2rem) - 20px));
                aspect-ratio: 1;
                border-radius: 8px;
                border: 1px solid rgba(var(--border-rgb), 0.2);
                box-sizing: border-box;
                object-fit: cover;
                user-select: none;
                height: 100%;
            }
        </style>
        <div class="card-content">
            <div class="app-content">
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">videocam</span>
                        <h3>Camera View</h3>
                    </div>
                    <div class="camera-feeds">
                        <img src="" alt="" id="left-camera" style="display: none;">
                    </div>
                </div>
                <div class="subcard">
                    <div class="app-header">
                        <span class="material-icons">videocam</span>
                        <h3>Camera View</h3>
                    </div>
                    <div class="camera-feeds">
                        <img src="" alt="" id="right-camera" style="display: none;">
                    </div>
                </div>
            </div>
        </div>
    `,

    setup() {
        function updateCameraFeeds(leftHostname, rightHostname) {
            const leftImage = document.querySelector('#left-camera');   
            if (leftHostname) {
                leftImage.src = `http://${leftHostname}:8000/stream.mjpg`;
                leftImage.style.display = 'block';
            } else {
                // display none
                leftImage.style.display = 'none';
            }

            const rightImage = document.querySelector('#right-camera');
            if (rightHostname) {
                rightImage.src = `http://${rightHostname}:8000/stream.mjpg`;
                rightImage.style.display = 'block';
            } else {
                // display none
                rightImage.style.display = 'none';
            }
        }

        function updateFromWindowConnections() {
            // window.robotConnections.connected is a set of connected robot names
            // window.robotConnections.profiles is a map of robot names to their profiles, and each profile has a hostname property

            let connectedRobotNames = Array.from(window.robotConnections.connected);

            let hostnames = []

            // sort the robot names by the order they appear in appdata robot profiles
            const robotProfiles = window.appData.sshProfiles.profiles;
            const robotNames = robotProfiles.map(profile => profile.name);

            // sort the robot names by the order they appear in appdata robot profiles
            const sortedConnectedRobotNames = connectedRobotNames.sort((a, b) => {
                return robotNames.indexOf(a) - robotNames.indexOf(b);
            });

            console.log('sortedConnectedRobotNames', sortedConnectedRobotNames);

            // get the hostnames from the profiles
            for (const robotName of sortedConnectedRobotNames) {
                hostnames.push(window.robotConnections.profiles[robotName].hostname);
            }

            console.log('updating camera feeds', hostnames);

            // update the camera feeds
            updateCameraFeeds(hostnames[0], hostnames[1]);
        }

        // handle robot connection events
        // Listen for robot connection events
        
        document.addEventListener('connectionsChanged', (event) => {
            console.log(event)

            updateFromWindowConnections();
        });

        updateFromWindowConnections();

        // Add context menu handlers for camera feeds
        const leftImage = document.querySelector('#left-camera');
        const rightImage = document.querySelector('#right-camera');

        function reloadImage(img) {
            if (img.src) {
                const currentSrc = img.src.split('?')[0];
                img.src = '';
                setTimeout(() => {
                    img.src = currentSrc + '?t=' + Date.now();
                }, 100);
            }
        }

        leftImage.addEventListener('contextmenu', (e) => {
            e.preventDefault();  // Prevent default context menu
            reloadImage(leftImage);
        });

        rightImage.addEventListener('contextmenu', (e) => {
            e.preventDefault();  // Prevent default context menu
            reloadImage(rightImage);
        });
    }
}); 