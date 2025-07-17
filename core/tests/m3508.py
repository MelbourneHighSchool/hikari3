#!/usr/bin/env python3
"""
Test script for M3508 motor using Motor.py
Drives the motor at 1 RPS with the provided configuration values.
"""

import time
import sys
import os

# Add the parent directory to path so we can import from components
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from components.Motor import Motor
from components.Wire import wire

def test_m3508_motor():
    """Test M3508 motor at 1 RPS"""
    print("Initializing M3508 motor test...")
    
    # Configuration values provided
    I2C_ADDRESS = 35
    ANGLE_OFFSET = 0  # Default angle offset
    CURRENT_LIMIT_AMPS = 3.0  # Safe current limit
    ELEC_ANGLE_OFFSET = 86515968
    SENSOR_DIRECTION = 1
    ENC1_OFFSET = 1233
    ENC2_OFFSET = 1229
    
    try:
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
        
        print("Motor initialized successfully!")
        print(f"Setting motor speed to 1 RPS...")
        
        # Set motor speed to 1 RPS
        motor.set_speed_rps(1.0)
        
        # Run for 10 seconds and monitor the speed
        test_duration = 10
        print(f"Running motor for {test_duration} seconds...")
        
        for i in range(test_duration):
            current_speed = motor.get_speed_rps()
            print(f"Time: {i+1}s, Target: 1.0 RPS, Actual: {current_speed:.3f} RPS")
            time.sleep(1)
        
        # Stop the motor
        print("Stopping motor...")
        motor.set_speed_rps(0)
        
        # Verify it stopped
        time.sleep(1)
        final_speed = motor.get_speed_rps()
        print(f"Motor stopped. Final speed: {final_speed:.3f} RPS")
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Error during motor test: {e}")
        # Try to stop the motor in case of error
        try:
            motor.set_speed_rps(0)
        except:
            pass
        raise

if __name__ == "__main__":
    test_m3508_motor()
