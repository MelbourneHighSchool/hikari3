# so all the interface settings, such as hsv ranges, are stored in the app_data.json folder on the laptop, in the interface folder

# we want to be able to upload it to the robot really fast too so that the robot can use the calibrated hsv ranges

# so the AppdataManager will read the app_data.json file, that is copied from the laptop

# it will also be able to add a listener to WebsocketServer, that will allow the laptop to send an updated app_data.json file data to the robot to calibrate the hsv ranges
    # this is only one way

# when the listener receives data (a JSON object over the websocket), it will update the data inside the AppdataManager class, and it will also update the app_data.json file on the robot

# when the AppdataManager class is initialised, it will also read the app_data.json file from the robot, and update the data inside the AppdataManager class

# if the AppdataManager is unable to use the WebsocketServer class, it'll just use the app_data.json file as normal, just without the websocket updating stuff



import json
import asyncio
import os

class AppdataManager:
    # the app_data.json file is in the core folder
    # appdatamanager is in the core/subsystems folder
    
    # Get the absolute path of the current file
    CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    # Go up one directory to get to core folder and join with app_data.json
    APP_DATA_PATH = os.path.join(os.path.dirname(CURRENT_DIR), 'app_data.json')


    def __init__(self, components, subsystems):
        
        self.robot_name = os.uname()[1]

        self.debug = True  # Debug flag
        
        # Check if there is a websocket server
        if 'WebsocketServer' in components:
            self.WebsocketServer = components['WebsocketServer']
            print(self.WebsocketServer)
        else:
            self.WebsocketServer = None
            print(f"[AppdataManager] WebsocketServer none")
        
        # Add callback registry
        self.update_callbacks = []

        self.robot_profile = None
        
        self.app_data = self.read_app_data_from_file()
        self.update_own_profile()
        self.needs_saving = False

        if self.WebsocketServer is not None:
            print(f"[AppdataManager] WebsocketServer found")
            self.setup_websocket_listener()
        else:
            print(f"[AppdataManager] WebsocketServer not found")

        # Define async tasks
        self.async_tasks = [self.periodic_save]

    def update_own_profile(self):
        profiles = self.app_data['sshProfiles']['profiles']
        for p in profiles:
            if p['name'] == self.robot_name: self.robot_profile = p

    def add_update_callback(self, callback):
        """Add a callback function to be called when app_data is updated"""
        if callable(callback):
            self.update_callbacks.append(callback)
            if self.debug:
                print(f"[AppdataManager] Added update callback: {callback.__name__}")
        else:
            print(f"[AppdataManager] Warning: Attempted to add non-callable callback")

    def remove_update_callback(self, callback):
        """Remove a callback function"""
        if callback in self.update_callbacks:
            self.update_callbacks.remove(callback)
            if self.debug:
                print(f"[AppdataManager] Removed update callback: {callback.__name__}")

    def update_app_data(self, app_data):
        if self.debug:
            print("[AppdataManager] Updating app data")
        self.app_data = app_data
        self.needs_saving = True
        self.update_own_profile()
        
        # Call all registered callbacks with the new app_data
        for callback in self.update_callbacks:
            try:
                callback(self.app_data)
            except Exception as e:
                print(f"[AppdataManager] Error in callback {callback.__name__}: {str(e)}")

    def read_app_data_from_file(self):
        try:
            with open(self.APP_DATA_PATH, 'r') as file:
                return json.load(file)
        except FileNotFoundError:
            raise FileNotFoundError(f"App data file not found at {self.APP_DATA_PATH}")
        
    def write_app_data_to_file(self):
        if self.debug:
            print("[AppdataManager] Saving app data to file")
        with open(self.APP_DATA_PATH, 'w') as file:
            json.dump(self.app_data, file)

    async def handle_app_data_update(self, message):
        if 'data' not in message:
            if self.debug:
                print("[AppdataManager] Received invalid websocket message - missing data field")
            return {'error': 'No data field in message'}
            
        if self.debug:
            print("[AppdataManager] Received app data update through websocket")
        self.update_app_data(message['data'])
        print(f"[AppdataManager] Updated app data")
        return {'status': 'success'}

    def setup_websocket_listener(self):
        if self.WebsocketServer is None:
            return
            
        self.WebsocketServer.add_message_handler('update_app_data', self.handle_app_data_update)
        print(f"[AppdataManager] Added message handler for update_app_data")

    async def periodic_save(self):
        """Periodically saves app data to file if changes are pending"""
        while True:
            if self.needs_saving:
                self.write_app_data_to_file()
                self.needs_saving = False
            await asyncio.sleep(5)  # Wait 5 seconds before next check
