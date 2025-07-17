#!/usr/bin/env python3
"""
Test script for loading motor configuration from app_data.json
Loads the first motor from the 'ni' robot profile and tests it
"""

import time
import sys
import os
import json

# Add the parent directory to path so we can import from components
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from components.Motor import Motor
from components.Wire import wire
from subsystems.AppdataManager import AppdataManager

def test_motor_from_config():
    """Test first motor loaded from ni robot profile configuration"""
    print("Loading motor configuration from app_data.json...")
    
    try:
        # Get the absolute path of app_data.json
        app_data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'app_data.json')
        
        # Load app_data.json
        with open(app_data_path, 'r') as file:
            app_data = json.load(file)
        
        # Find the ni profile
        ni_profile = next(
            (profile for profile in app_data['sshProfiles']['profiles'] 
             if profile['name'] == 'ni'),
            None
        )
        
        if not ni_profile:
            raise ValueError("Could not find 'ni' profile in app_data.json")
            
        # Get motor1 configuration
        motor1_config = ni_profile['motors']['motor1']
        
        # Parse the calibration values
        elec_angle_offset, enc1_offset, enc2_offset = map(int, motor1_config['calibration'].split(','))
        
        print("\nMotor Configuration:")
        print(f"I2C Address: {motor1_config['i2c']}")
        print(f"Angle Offset: {motor1_config['angle']}°")
        print(f"Current Limit: {motor1_config['amps']} A")
        print(f"Electrical Angle Offset: {elec_angle_offset}")
        print(f"Encoder 1 Offset: {enc1_offset}")
        print(f"Encoder 2 Offset: {enc2_offset}")
        
        # # Initialize motor with configuration
        # motor = Motor(
        #     i2c_address=int(motor1_config['i2c']),
        #     wire=wire,
        #     angle_offset=float(motor1_config['angle']),
        #     current_limit_amps=float(motor1_config['amps']),
        #     elec_angle_offset=elec_angle_offset,
        #     sensor_direction=int(motor1_config['pole']),
        #     enc1_offset=enc1_offset,
        #     enc2_offset=enc2_offset
        # )

            
        # Configuration values provided
        I2C_ADDRESS = 35
        ANGLE_OFFSET = 0  # Default angle offset
        CURRENT_LIMIT_AMPS = 3.0  # Safe current limit
        ELEC_ANGLE_OFFSET = 86515968
        SENSOR_DIRECTION = -1
        ENC1_OFFSET = 1233
        ENC2_OFFSET = 1229
        
        # check if the avalues match up
        print(f"actual: {I2C_ADDRESS}, loaded: {motor1_config['i2c']}")
        print(f"actual: {ANGLE_OFFSET}, loaded: {motor1_config['angle']}")
        print(f"actual: {CURRENT_LIMIT_AMPS}, loaded: {motor1_config['amps']}")
        print(f"actual: {ELEC_ANGLE_OFFSET}, loaded: {motor1_config['calibration'].split(',')[0]}")
        print(f"actual: {SENSOR_DIRECTION}, loaded: {motor1_config['pole']}")
        print(f"actual: {ENC1_OFFSET}, loaded: {motor1_config['calibration'].split(',')[1]}")
        print(f"actual: {ENC2_OFFSET}, loaded: {motor1_config['calibration'].split(',')[2]}")
        
        # Initialize the motor with provided config values
        motor = Motor(
            i2c_address=I2C_ADDRESS,
            wire=wire,
            angle_offset=ANGLE_OFFSET,
            current_limit_amps=CURRENT_LIMIT_AMPS,
            elec_angle_offset=ELEC_ANGLE_OFFSET,
            sensor_direction=SENSOR_DIRECTION,
            enc1_offset=ENC1_OFFSET,
            enc2_offset=ENC2_OFFSET
        )
        
        print("\nMotor initialized successfully!")
        print("Running basic motor test...")
        
        # Test sequence
        print("Setting motor speed to 1 RPS...")
        motor.set_speed_rps(1.0)
        
        # Monitor speed for 5 seconds
        for i in range(5):
            current_speed = motor.get_speed_rps()
            print(f"Time: {i+1}s, Target: 1.0 RPS, Actual: {current_speed:.3f} RPS")
            time.sleep(1)
        
        # Stop the motor
        print("\nStopping motor...")
        motor.set_speed_rps(0)
        
        # Verify it stopped
        time.sleep(1)
        final_speed = motor.get_speed_rps()
        print(f"Motor stopped. Final speed: {final_speed:.3f} RPS")
        
        print("\nTest completed successfully!")
        
    except Exception as e:
        print(f"Error during motor test: {e}")
        # Try to stop the motor in case of error
        try:
            if 'motor' in locals():
                motor.set_speed_rps(0)
        except:
            pass
        raise

if __name__ == "__main__":
    test_motor_from_config()
