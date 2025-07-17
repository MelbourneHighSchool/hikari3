#!/usr/bin/env python3
"""
Test script for Drivetrain subsystem using four M3508 motors
Tests basic movement commands including forward, rotation, and diagonal movement
"""

import time
import sys
import os

# Add the parent directory to path so we can import from components and subsystems
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from components.Motor import Motor
from components.Wire import wire
from subsystems.Drivetrain import Drivetrain

def create_motor(i2c_addr, elec_angle_offset, enc1_offset, enc2_offset, angle_offset):
    """Helper function to create a motor with given parameters"""
    return Motor(
        i2c_address=i2c_addr,
        wire=wire,
        angle_offset=angle_offset,  # Mechanical angle offset for drivetrain
        current_limit_amps=0.1,     # Safe current limit
        elec_angle_offset=elec_angle_offset,
        sensor_direction=1,         # All motors use same direction
        enc1_offset=enc1_offset,
        enc2_offset=enc2_offset
    )

def test_drivetrain():
    """Test Drivetrain with four M3508 motors"""
    print("Initializing Drivetrain test with four M3508 motors...")
    
    try:
        # Create motors with their specific configurations
        # Note: angle_offset is the mechanical angle for drivetrain calculations
        # Front Left = 45°, Front Right = 135°, Back Right = 225°, Back Left = 315°
        motors = [
            create_motor(35, 86515968, 1233, 1229, 45),    # Front Left
            create_motor(36, 69921792, 1242, 1250, 135),   # Front Right
            create_motor(37, 5775360,  1245, 1247, 225),   # Back Right
            create_motor(38, 17427968, 1234, 1236, 315),   # Back Left
        ]
        
        # Create components dictionary for Drivetrain
        components = {
            "Motors": motors
        }
        
        # Initialize Drivetrain
        drivetrain = Drivetrain(components, subsystems={})
        print("Drivetrain initialized successfully!")
        
        # Test sequence
        test_movements = [
            ("Forward", 0, 0.5, 0),      # Direction: 0°, Speed: 0.5, No rotation
            ("Right", 90, 0.5, 0),       # Direction: 90°, Speed: 0.5, No rotation
            ("Backward", 180, 0.5, 0),   # Direction: 180°, Speed: 0.5, No rotation
            ("Left", 270, 0.5, 0),       # Direction: 270°, Speed: 0.5, No rotation
            ("Spin CW", 0, 0, 0.5),      # Rotation only clockwise
            ("Spin CCW", 0, 0, -0.5),    # Rotation only counter-clockwise
            ("Diagonal FR", 45, 0.5, 0),  # Diagonal front-right
            ("Diagonal FL", 315, 0.5, 0), # Diagonal front-left
        ]
        
        # Run each test movement
        for movement_name, direction, speed, rotation in test_movements:
            print(f"\nTesting {movement_name} movement...")
            print(f"Direction: {direction}°, Speed: {speed}, Rotation: {rotation}")
            
            # Apply movement
            drivetrain.quickdrive(direction, speed, rotation)
            
            # Run for 2 seconds while monitoring speeds
            start_time = time.time()
            while time.time() - start_time < 2:
                current_speed = drivetrain.get_current_speed()
                print(f"Current speed: {current_speed:.3f}")
                time.sleep(0.5)
            
            # Stop before next movement
            drivetrain.quickdrive(0, 0, 0)
            time.sleep(0.5)
        
        print("\nStopping all motors...")
        drivetrain.quickdrive(0, 0, 0)
        print("Test completed successfully!")
        
    except Exception as e:
        print(f"Error during drivetrain test: {e}")
        # Try to stop all motors in case of error
        try:
            if 'drivetrain' in locals():
                drivetrain.quickdrive(0, 0, 0)
        except:
            pass
        raise

if __name__ == "__main__":
    test_drivetrain()
