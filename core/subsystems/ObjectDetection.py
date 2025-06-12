import json
import math
import cv2
import numpy as np
from threading import Lock
import time
import asyncio


class ObjectDetection:
    def __init__(self, components, subsystems):
        # Check required components and subsystems
        if 'Camera' not in components:
            raise AttributeError("components must have property 'Camera'")
        if 'AppdataManager' not in subsystems:
            raise AttributeError("subsystems must have property 'AppdataManager'")
            
        self.camera = components['Camera']
        self.appdata_manager = subsystems['AppdataManager']

        # Optional: WebsocketServer
        if 'WebsocketServer' in components:
            self.websocket_server = components['WebsocketServer']
        else:
            self.websocket_server = None
        
        self.detected_objects = {}  # Will store positions for all tracked objects
        self.detection_lock = Lock()
        self.time_object_detection = False  # Toggle for timing measurements
        self.write_object_positions_text = False  # Toggle for position text
        self.write_fps_text = True  # Toggle for FPS counter
        
        # Add FPS tracking variables
        self.frame_times = []
        self.max_frame_history = 30  # Number of frames to average FPS over
        self.last_frame_time = time.time()
        
        # Initialize callback list
        self.frame_callbacks = []
        
        # Load initial configuration from app_data
        self._update_from_app_data(self.appdata_manager.app_data)
        
        # Register callback for app_data updates
        self.appdata_manager.add_update_callback(self._update_from_app_data)
        
        # Set up camera callback to process frames
        self.camera.set_callback(self._process_frame)
        print('set up callback !!!!!')
        
        # Add minimum contour size constant
        self.MIN_CONTOUR_SIZE = {
            'ball': 20,
            'blueGoal': 200,
            'yellowGoal': 200
        }

        self.touching_line = False
        self.touching_line_angle = None
    
    def _update_from_app_data(self, app_data):
        """Update object configurations from app_data"""
        # print("\n[ObjectDetection] Updating from app_data...")
        
        if 'visionProfiles' not in app_data:
            # print("[ObjectDetection] No visionProfiles in app_data")
            return
            
        vision_data = app_data['visionProfiles']
        current_profile = vision_data.get('currentlySelected')
        if not current_profile:
            # print("[ObjectDetection] No profile currently selected")
            return
            
        # print(f"[ObjectDetection] Loading profile: {current_profile}")
        
        # Find the current profile
        profile = next(
            (p for p in vision_data['profiles'] if p['name'] == current_profile), 
            None
        )

        # print(profile)

        if not profile:
            # print(f"[ObjectDetection] Profile '{current_profile}' not found in profiles")
            return
            
        # Update camera settings if available
        if 'camera' in profile:
            # print("\n[ObjectDetection] Updating camera settings:")
            if 'exposure' in profile['camera']:
                exposure = profile['camera']['exposure']
                # print(f"  Setting exposure to: {exposure}")
                self.camera.picam2.controls.ExposureTime = exposure
                
            if 'saturation' in profile['camera']:
                saturation = profile['camera']['saturation']
                # print(f"  Setting saturation to: {saturation}")
                self.camera.picam2.controls.Saturation = saturation
        
        # Convert profile data to objects_config format
        objects_config = [
            {
                'name': 'ball',
                'hsv_range': [
                    [profile['ball']['min']['h'], profile['ball']['min']['s'], profile['ball']['min']['v']],
                    [profile['ball']['max']['h'], profile['ball']['max']['s'], profile['ball']['max']['v']]
                ],
                'mask_on': profile['ball'].get('mask_on', False)
            },
            {
                'name': 'yellowGoal',
                'hsv_range': [
                    [profile['yellowGoal']['min']['h'], profile['yellowGoal']['min']['s'], profile['yellowGoal']['min']['v']],
                    [profile['yellowGoal']['max']['h'], profile['yellowGoal']['max']['s'], profile['yellowGoal']['max']['v']]
                ],
                'mask_on': profile['yellowGoal'].get('mask_on', False)
            },
            {
                'name': 'blueGoal',
                'hsv_range': [
                    [profile['blueGoal']['min']['h'], profile['blueGoal']['min']['s'], profile['blueGoal']['min']['v']],
                    [profile['blueGoal']['max']['h'], profile['blueGoal']['max']['s'], profile['blueGoal']['max']['v']]
                ],
                'mask_on': profile['blueGoal'].get('mask_on', False)
            }
        ]
        
        # print("\n[ObjectDetection] Configured HSV ranges:")
        # for obj in objects_config:
            # print(f"\n{obj['name']}:")
            # print(f"  min: H={obj['hsv_range'][0][0]}, S={obj['hsv_range'][0][1]}, V={obj['hsv_range'][0][2]}")
            # print(f"  max: H={obj['hsv_range'][1][0]}, S={obj['hsv_range'][1][1]}, V={obj['hsv_range'][1][2]}")
        
        # Update object configurations
        with self.detection_lock:
            self.detected_objects = {obj['name']: None for obj in objects_config}
            self.objects_config = objects_config
            # print("\n[ObjectDetection] Updated configuration successfully")
    
    def add_frame_callback(self, callback):
        """
        Add a callback function to be called after each frame is processed.
        
        Args:
            callback: A function that takes two arguments:
                     - rgb_array: The processed RGB frame
                     - detected_objects: Dictionary of detected objects and their positions
        """
        with self.detection_lock:
            print(f"Adding callback: {callback.__name__}")  # Add debug print
            self.frame_callbacks.append(callback)

    def remove_frame_callback(self, callback):
        """
        Remove a previously registered frame callback.
        
        Args:
            callback: The callback function to remove
        """
        with self.detection_lock:
            if callback in self.frame_callbacks:
                self.frame_callbacks.remove(callback)

    def clear_frame_callbacks(self):
        """
        Remove all registered frame callbacks.
        """
        with self.detection_lock:
            print(f"Clearing {len(self.frame_callbacks)} frame callbacks")  # Add debug print
            self.frame_callbacks.clear()

    def _process_frame(self, rgb_array, hsv_array):
        """
        Camera callback function that processes each frame.
        Updates positions for all tracked objects.
        """
        # Calculate FPS
        current_time = time.time()
        self.frame_times.append(current_time - self.last_frame_time)
        self.last_frame_time = current_time
        
        # Keep frame history at max length
        if len(self.frame_times) > self.max_frame_history:
            self.frame_times.pop(0)
      
    def get_object_position(self, object_name):
        """
        Returns the current position of the specified object.
        
        Args:
            object_name: str, name of the object to get position for
            
        Returns:
            tuple: (x, y) coordinates of the object's center, or None if not detected
        """
        with self.detection_lock:
            return self.detected_objects.get(object_name)
    
    def get_all_positions(self):
        """
        Returns positions of all tracked objects.
        
        Returns:
            dict: {object_name: (x,y) or None for each object}
        """
        with self.detection_lock:
            return self.detected_objects.copy()
    
    def detect_object(self, hsv_array, hsv_range, original_array=None, object_name=None):
        """
        Detect an object in the HSV image and return its contour.
        Simply finds the largest contour in the color range that is larger than MIN_CONTOUR_SIZE.
        
        Args:
            hsv_array: numpy array of the HSV image
            hsv_range: [[lower_hsv], [upper_hsv]] bounds
            original_array: optional, original image to draw contours on
            
        Returns:
            numpy array of the largest contour, or None if no object is detected
        """
        camera_config = self.appdata_manager.robot_profile['camera']
        center = (int(camera_config['centre']['x']), int(camera_config['centre']['y']))
        

        lower_bound, upper_bound = hsv_range

        # Create a mask for the object
        object_mask = self._get_mask(hsv_array, lower_bound, upper_bound)

        # Find contours
        contours, _ = cv2.findContours(object_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        # Filter out small contours
        contours = [cnt for cnt in contours if cv2.contourArea(cnt) > self.MIN_CONTOUR_SIZE[object_name]]

        
        # Draw contours if original array is provided
        if original_array is not None:
            cv2.drawContours(original_array, contours, -1, (0, 255, 0), 1)

        if not contours:
            return None
        
        sorted_contours = sorted(contours, key=cv2.contourArea, reverse=True)

        # Find the largest contour
        largest_contour = sorted_contours[0]

        # Draw the convex hull outline in magenta
        cv2.drawContours(original_array, [largest_contour], 0, (255, 0, 255), 2)

        return largest_contour
    
    @staticmethod
    def _get_mask(hsv_array, lower_bound, upper_bound):
        """Create a mask from the HSV array based on the given bounds."""
        lower_bound = tuple(lower_bound)
        upper_bound = tuple(upper_bound)

        # if the lower bound saturation is higher than the upper bound, let's swap them
        if lower_bound[1] > upper_bound[1]:
            lower_bound, upper_bound = upper_bound, lower_bound

        # if the lower bound value is higher than the upper bound, let's swap them
        if lower_bound[2] > upper_bound[2]:
            lower_bound, upper_bound = upper_bound, lower_bound

        # if the lower bound hue is higher than the upper bound, handle wraparound case for red hue
        if lower_bound[0] > upper_bound[0]:
            # Handle wraparound case for red hue
            lower_mask = cv2.inRange(hsv_array, lower_bound, (180, upper_bound[1], upper_bound[2]))
            upper_mask = cv2.inRange(hsv_array, (0, lower_bound[1], lower_bound[2]), upper_bound)
            return cv2.bitwise_or(lower_mask, upper_mask)
        else:
            return cv2.inRange(hsv_array, lower_bound, upper_bound)

    # def _handle_broadcast_error(self, task):
    #     """Handle any errors from the broadcast task"""
    #     try:
    #         task.result()
    #     except Exception as e:
    #         print(f"[ObjectDetection] Broadcast error: {str(e)}")
