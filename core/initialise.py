import asyncio
import json
import time
from components.Wire import wire
from components.Motor import Motor
from components.M2006 import M2006
from components.Compass import Compass
from components.Dribbler import Dribbler
from subsystems.Drivetrain import Drivetrain
from subsystems.ObjectDetection import ObjectDetection
from subsystems.AppdataManager import AppdataManager
from components.Kicker import Kicker
from components.LineRing import LineRing
from components.Comm import GPIOMonitor

import os

robot_name = os.uname()[1]

print(f"ROBOT IS {robot_name}")

print("Initialisation started")

#

components = {}
subsystems = {}
overseers = {}

#

print("Initialising components...")

#

try:
    from components.WebsocketServer import WebsocketServer
    
    # Create WebSocket server instance
    websocket_server = WebsocketServer(host="0.0.0.0", port=5000)
    components["WebsocketServer"] = websocket_server
    
    print("Successfully initialised websocket server")
    
except Exception as e:
    print("Failed to initialise websocket server:", e)

#

# Initialize AppdataManager
try:
    appdata_manager = AppdataManager(components, subsystems)
    subsystems["AppdataManager"] = appdata_manager
    print("Successfully initialised appdata manager")
except Exception as e:
    print("Failed to initialise appdata manager:", e)

#

profiles = appdata_manager.app_data['sshProfiles']['profiles']
print(profiles)

robot_profile = appdata_manager.robot_profile

for p in profiles:
    if p['name'] == robot_name: robot_profile = p

print('------ ME ------')
print(robot_profile)

# robot_profile['motors']['motor1']

# {'motor1': {'type': 'M3508', 'i2c': '27', 'angle': '50', 'pole': '1', 'amps': '10', 'calibration': '175907840,1252,1240'}

if robot_profile == None:
    print('COULD NOT FIND ROBOT PROFILE')


#

def config_to_motor(motor_config):
    # {'motor1': {'type': 'M3508', 'i2c': '27', 'angle': '50', 'pole': '1', 'amps': '10', 'calibration': '175907840,1252,1240'}
        
    mc = motor_config

    if motor_config['type'] == 'M3508':
        calibration = mc['calibration'].split(',')

        print('--------------------------------')
        print(mc)
        print(calibration)

        m = Motor(
            i2c_address=int(mc['i2c']),
            wire=wire,
            angle_offset=int(mc['angle']),
            current_limit_amps=float(mc['amps']),
            elec_angle_offset=int(calibration[0]),
            sensor_direction=int(mc['pole']),
            enc1_offset=int(calibration[1]),
            enc2_offset=int(calibration[2])
        )
        
        return m
    elif motor_config['type'] == 'M2006':
        #'motorD': {'type': 'M2006', 'i2c': '31', 'angle': '0', 'pole': '-1',
        #  'amps': '194', 'calibration': '1325600000,1240,1240'}

        calibration = mc['calibration'].split(',')

        m = M2006(
            i2c_address=int(mc['i2c']),
            wire=wire,
            angle_offset=int(mc['angle']),
            current_limit_amps=float(mc['amps']),
            elec_angle_offset=int(calibration[0]),
            sincos_center=int(calibration[1]),
            polarity=int(mc['pole'])
        )

        return m

# Initialize Motors
try:
    motors = [
        config_to_motor(robot_profile['motors']['motor1']),
        config_to_motor(robot_profile['motors']['motor2']),
        config_to_motor(robot_profile['motors']['motor3']),
        config_to_motor(robot_profile['motors']['motor4'])
    ]

    components["Motors"] = motors
    print(motors)
    print("Successfully initialised motors")
except Exception as e:
    print("Failed to initialise motors:", e)


# Initialize Dribbler
try:
    if robot_profile['motors']['motorD']['type'].lower() == "m2006":
        dribbler = Dribbler(
            motor=config_to_motor(robot_profile['motors']['motorD'])
        )
        components["Dribbler"] = dribbler
        print("Successfully initialised dribbler")
    else:
        print("No dribbler (failed)")
except Exception as e:
    print("Failed to initialise dribbler:", e)


# Initialize Camera
try:
    from components.Camera import Camera
    camera = Camera(PORT=8000, resolution=(640, 420), frame_rate=60)
    components["Camera"] = camera
    print("Successfully initialised camera")
except Exception as e:
    print("Failed to initialise camera:", e)

# Initialize Compass
try:
    compass = Compass()
    components["Compass"] = compass

    time.sleep(0.1)

    compass.zero()

    print("Successfully initialised compass")
except Exception as e:
    print("Failed to initialise compass:", e)


# Initialize Kicker
try:
    kicker = Kicker(17)
    components["Kicker"] = kicker
    print("Successfully initialised kicker")
except Exception as e:
    print("Failed to initialise kicker:", e)

# Initialize LineRing
try:
    line_ring = LineRing(threshold=0.4, angle_offset=30)
    components["LineRing"] = line_ring
    print("Successfully initialised line ring")
except Exception as e:
    print("Failed to initialise line ring:", e)

# Initialize Communication Monitor
try:
    comm_monitor = GPIOMonitor(22, cooldown=0.1, pull_up=False)
    components["Comm"] = comm_monitor
    print("Successfully initialised communication monitor")
except Exception as e:
    print("Failed to initialise communication monitor:", e)


print("Initialising subsystems...")

#

# Initialize Drivetrain
try:
    drivetrain = Drivetrain(components, subsystems)
    subsystems["Drivetrain"] = drivetrain

    
    drivetrain.manual = True

    print("Successfully initialised drivetrain")
except Exception as e:
    print("Failed to initialise drivetrain:", e)

#

# Initialize RemoteControl
try:
    from subsystems.RemoteControl import RemoteControl
    remote_control = RemoteControl(components, subsystems)
    subsystems["RemoteControl"] = remote_control
    print("Successfully initialised remote control")
except Exception as e:
    print("Failed to initialise remote control:", e)

# Initialize ObjectDetection
try:
    print('initialising object detect')
    object_detection = ObjectDetection(components, subsystems)
    print('initilaised object detect')
    
    # Enable timing and position text
    object_detection.time_object_detection = True
    object_detection.write_object_positions_text = True
    
    subsystems["ObjectDetection"] = object_detection
    print("Successfully initialised object detection")
except Exception as e:
    print("Failed to initialise object detection:", e)

#




# # Initialize Defender
# try:
#     from overseers.Defender import Defender
#     defender = Defender(components, subsystems)
#     overseers["Defender"] = defender
#     print("Successfully initialised defender")
# except Exception as e:
#     print("Failed to initialise defender:", e)


#

async def run_tasks():
    """Run all async tasks"""
    try:
        # Create a list to hold all tasks
        tasks = []
        
        # Gather tasks from components
        for component in components.values():
            if hasattr(component, 'async_tasks'):
                for task_func in component.async_tasks:
                    tasks.append(asyncio.create_task(task_func()))
        
        # Gather tasks from subsystems
        for subsystem in subsystems.values():
            if hasattr(subsystem, 'async_tasks'):
                for task_func in subsystem.async_tasks:
                    tasks.append(asyncio.create_task(task_func()))
        
        # Gather tasks from overseers
        for overseer in overseers.values():
            if hasattr(overseer, 'async_tasks'):
                for task_func in overseer.async_tasks:
                    tasks.append(asyncio.create_task(task_func()))
        
        # Wait for all tasks to complete (they shouldn't complete normally)
        await asyncio.gather(*tasks)
        
    except KeyboardInterrupt:
        print("\nShutting down...")
        # Cancel all running tasks
        for task in tasks:
            task.cancel()
        # Wait for tasks to finish cancelling
        await asyncio.gather(*tasks, return_exceptions=True)

# Run all async tasks if this file is run directly
if __name__ == "__main__":
    print("Starting async tasks...")
    asyncio.run(run_tasks())

#