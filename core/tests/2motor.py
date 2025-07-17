#!/usr/bin/env python3
"""
Test script for two M3508 motors using Motor.py
Drives both motors at 1 RPS with their respective configuration values.
"""

import time
import sys
import os

# Add the parent directory to path so we can import from components
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from components.Motor import Motor
from components.Wire import wire

def test_two_m3508_motors():
    """Test two M3508 motors at 1 RPS"""
    print("Initializing two M3508 motors test...")
    
    # Configuration values for Motor 1 (I2C 35)
    MOTOR1_I2C_ADDRESS = 35
    MOTOR1_ANGLE_OFFSET = 0  # Default angle offset
    MOTOR1_CURRENT_LIMIT_AMPS = 3.0  # Safe current limit
    MOTOR1_ELEC_ANGLE_OFFSET = 86515968
    MOTOR1_SENSOR_DIRECTION = 1
    MOTOR1_ENC1_OFFSET = 1233
    MOTOR1_ENC2_OFFSET = 1229

    # Configuration values for Motor 2 (I2C 36)
    MOTOR2_I2C_ADDRESS = 36
    MOTOR2_ANGLE_OFFSET = 0  # Default angle offset
    MOTOR2_CURRENT_LIMIT_AMPS = 3.0  # Safe current limit
    MOTOR2_ELEC_ANGLE_OFFSET = 69921792
    MOTOR2_SENSOR_DIRECTION = 1
    MOTOR2_ENC1_OFFSET = 1242
    MOTOR2_ENC2_OFFSET = 1250
    
    try:
        # Initialize motor 1
        motor1 = Motor(
            i2c_address=MOTOR1_I2C_ADDRESS,
            wire=wire,
            angle_offset=MOTOR1_ANGLE_OFFSET,
            current_limit_amps=MOTOR1_CURRENT_LIMIT_AMPS,
            elec_angle_offset=MOTOR1_ELEC_ANGLE_OFFSET,
            sensor_direction=MOTOR1_SENSOR_DIRECTION,
            enc1_offset=MOTOR1_ENC1_OFFSET,
            enc2_offset=MOTOR1_ENC2_OFFSET
        )

        # Initialize motor 2
        motor2 = Motor(
            i2c_address=MOTOR2_I2C_ADDRESS,
            wire=wire,
            angle_offset=MOTOR2_ANGLE_OFFSET,
            current_limit_amps=MOTOR2_CURRENT_LIMIT_AMPS,
            elec_angle_offset=MOTOR2_ELEC_ANGLE_OFFSET,
            sensor_direction=MOTOR2_SENSOR_DIRECTION,
            enc1_offset=MOTOR2_ENC1_OFFSET,
            enc2_offset=MOTOR2_ENC2_OFFSET
        )
        
        print("Both motors initialized successfully!")
        print("Setting both motors speed to 1 RPS...")
        
        # Set both motors speed to 1 RPS
        motor1.set_speed_rps(1.0)
        motor2.set_speed_rps(1.0)
        
        # Run for 10 seconds and monitor the speeds
        test_duration = 5
        print(f"Running motors for {test_duration} seconds...")
        
        for i in range(test_duration):
            motor1_speed = motor1.get_speed_rps()
            motor2_speed = motor2.get_speed_rps()
            print(f"Time: {i+1}s")
            print(f"Motor 1 - Target: 1.0 RPS, Actual: {motor1_speed:.3f} RPS")
            print(f"Motor 2 - Target: 1.0 RPS, Actual: {motor2_speed:.3f} RPS")
            print("-" * 50)
            time.sleep(1)
        
        # Stop both motors
        print("Stopping motors...")
        motor1.set_speed_rps(0)
        motor2.set_speed_rps(0)
        
        # Verify they stopped
        time.sleep(1)
        final_speed1 = motor1.get_speed_rps()
        final_speed2 = motor2.get_speed_rps()
        print(f"Motors stopped.")
        print(f"Motor 1 final speed: {final_speed1:.3f} RPS")
        print(f"Motor 2 final speed: {final_speed2:.3f} RPS")
        
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Error during motors test: {e}")
        # Try to stop both motors in case of error
        try:
            motor1.set_speed_rps(0)
            motor2.set_speed_rps(0)
        except:
            pass
        raise

if __name__ == "__main__":
    test_two_m3508_motors()
