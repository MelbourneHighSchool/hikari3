import math
import time
import asyncio
from utils.Translation import Translation
from utils.Rotation import Rotation

class Drivetrain:
    def __init__(self, components, subsystems, acceleration_limit=None):
        # Invariant: `components` must have property `Motors`
        if not 'Motors' in components:
            raise AttributeError("components must have property 'Motors'")

        # Require Compass component
        if 'Compass' in components:
            self.compass_enabled = True
            self.Compass = components["Compass"]
        else:
            self.compass_enabled = False 

        self.Motors = components["Motors"]
        
        # Initialize acceleration parameters
        self.acceleration_limit = acceleration_limit if acceleration_limit is not None else 2.0  # Default acceleration limit (units/second²)
        
#

        self.manual = False
 
        # Timing
        self.last_update_time = time.time()
        
        # Add this method to async_tasks for regular updates
        # self.async_tasks = [self.update_loop]
    
    async def update_loop(self):
        """Continuously update motor values based on acceleration limits"""
        while True:
            self.update()
            await asyncio.sleep(0.02)  # 50Hz update rate (0.02 seconds between updates)
    
    def update(self):
        pass

    def quickdrive(self, direction, speed, rotation):
        """Set target values and immediately apply them (no acceleration)"""
        # For direct control, bypass acceleration and update immediately
        self.current_speed = speed
        self.current_direction = direction
        self.current_rotation = rotation
        
        # Apply directly to motors
        for motor in self.Motors:
            angle_offset = motor.angle_offset - direction + 180
            angle_offset_rad = angle_offset * (math.pi / 180)
            motor.set_speed_rps(speed * math.sin(angle_offset_rad) - rotation)
    
    def spin(self, speed):
        for motor in self.Motors:
            motor.set_speed_rps(-speed)
        
    def quickdrive_with_compass_north(self, direction, speed, rotation, current_orientation):
        """Set target values with compass adjustment"""
        self.quickdrive(direction - current_orientation, speed, rotation)
    
    def handle_remote_control(self, angle, speed, rotation):
        # """Handle remote control input by setting target values"""
        # self.set_target_values(angle, speed, 0)  # Set targets with zero rotation
        self.quickdrive(angle, speed, rotation)
    
    def get_current_speed(self):
        #
        x = 0
        y = 0
        #
        for motor in self.Motors:
            # angle_offset = motor.angle_offset - direction + 180
            # angle_offset_rad = angle_offset * (math.pi / 180)
            # motor.set_speed_rps(speed * math.sin(angle_offset_rad) - rotation)

            spd = motor.get_speed_rps()
            angle = motor.angle_offset
            angle_rad = angle * (math.pi / 180)

            y += math.cos(angle_rad)
            x += math.sin(angle_rad)

        x /= 2
        y /= 2

        return math.sqrt(x ** 2 + y ** 2)