#!/usr/bin/env python3
"""
Test script for LineRing and Compass components running at 30Hz
"""

import time
import sys
import os

# Add the parent directory to the path so we can import from components
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from components.LineRing import LineRing
from components.Compass import Compass

def test_line_and_compass():
    """
    Test both LineRing and Compass components at 30Hz
    """
    print("Initializing LineRing and Compass components...")
    
    # Initialize components
    try:
        line_ring = LineRing(threshold=0.4, angle_offset=30)
        print("✓ LineRing initialized successfully")
    except Exception as e:
        print(f"✗ Failed to initialize LineRing: {e}")
        return
    
    try:
        compass = Compass()
        print("✓ Compass initialized successfully")
        
        # Zero the compass
        print("Zeroing compass...")
        compass.zero()
        print("✓ Compass zeroed")
        
    except Exception as e:
        print(f"✗ Failed to initialize Compass: {e}")
        return
    
    print("\nStarting 30Hz test loop...")
    print("Press Ctrl+C to stop\n")
    
    # 30Hz means 1/30 seconds = 0.0333 seconds between readings
    target_frequency = 30.0
    target_period = 1.0 / target_frequency
    
    loop_count = 0
    start_time = time.time()
    
    try:
        while True:
            loop_start = time.time()
            
            # Read compass data
            compass_heading = compass.get_heading()
            compass_signed = compass.get_signed_heading()
            compass_raw = compass.get_raw_heading()
            
            # Read line detection data
            line_result = line_ring.detect_line()
            
            # Clear screen and display results
            if loop_count % 10 == 0:  # Clear screen every 10 iterations to reduce flicker
                os.system('cls' if os.name == 'nt' else 'clear')
            
            print(f"\r{'='*60}")
            print(f"Loop: {loop_count:6d} | Frequency: {1.0/(time.time()-loop_start+0.001):.1f} Hz")
            print(f"{'='*60}")
            
            # Display compass data
            print(f"COMPASS:")
            print(f"  Raw Heading:    {compass_raw:.2f}°" if compass_raw is not None else "  Raw Heading:    None")
            print(f"  Heading:        {compass_heading:.2f}°" if compass_heading is not None else "  Heading:        None")
            print(f"  Signed Heading: {compass_signed:.2f}°" if compass_signed is not None else "  Signed Heading: None")
            
            # Display line detection data
            print(f"\nLINE DETECTION:")
            if line_result['detected']:
                print(f"  ⚠️  LINE DETECTED!")
                print(f"  Line Angle:     {line_result['angle']:.2f}°")
                print(f"  Raw Angles:     {[f'{a:.1f}°' for a in line_result['raw_angles']]}")
                print(f"  Reverse Dir:    {(line_result['angle'] + 180) % 360:.2f}°")
            else:
                print(f"  ✓  No line detected")
                print(f"  Line Angle:     None")
                print(f"  Raw Angles:     []")
            
            # Display sensor summary (first 8 sensors as sample)
            sensor_data = line_ring.read_sensors()
            print(f"\nSENSORS (sample - first 8):")
            for i in range(min(8, len(sensor_data))):
                angle, value = sensor_data[i]
                status = "HIGH" if value > line_ring.threshold else "low "
                print(f"  S{i:2d}: {angle:6.1f}° = {value:.3f} ({status})", end="")
                if i % 2 == 1:
                    print()  # New line every 2 sensors
            if len(sensor_data) > 8:
                print(f"\n  ... and {len(sensor_data) - 8} more sensors")
            
            # Performance metrics
            elapsed = time.time() - start_time
            avg_frequency = loop_count / elapsed if elapsed > 0 else 0
            print(f"\nPERFORMANCE:")
            print(f"  Target Freq:    {target_frequency:.1f} Hz")
            print(f"  Average Freq:   {avg_frequency:.1f} Hz")
            print(f"  Runtime:        {elapsed:.1f}s")
            
            print(f"{'='*60}")
            
            # Calculate sleep time to maintain 30Hz
            loop_duration = time.time() - loop_start
            sleep_time = max(0, target_period - loop_duration)
            
            if sleep_time > 0:
                time.sleep(sleep_time)
            
            loop_count += 1
            
    except KeyboardInterrupt:
        print(f"\n\nTest stopped by user")
        print(f"Total loops: {loop_count}")
        print(f"Total time: {time.time() - start_time:.2f}s")
        print(f"Average frequency: {loop_count / (time.time() - start_time):.2f} Hz")
        print("Goodbye!")

def test_sensors_debug():
    """
    Debug mode showing detailed sensor readings
    """
    print("Initializing LineRing for debug mode...")
    
    try:
        line_ring = LineRing(threshold=0.4, angle_offset=30)
        print("✓ LineRing initialized successfully")
    except Exception as e:
        print(f"✗ Failed to initialize LineRing: {e}")
        return
    
    print("\nDebug mode - showing all sensor readings")
    print("Press Ctrl+C to stop\n")
    
    try:
        while True:
            os.system('cls' if os.name == 'nt' else 'clear')
            
            print("="*80)
            print("LINE RING SENSOR DEBUG")
            print("="*80)
            
            # Get line detection
            line_result = line_ring.detect_line()
            
            if line_result['detected']:
                print(f"⚠️  LINE DETECTED at {line_result['angle']:.2f}°")
                print(f"Raw angles: {line_result['raw_angles']}")
            else:
                print("✓ No line detected")
            
            print(f"\nThreshold: {line_ring.threshold}")
            print("-" * 80)
            
            # Show all sensor readings
            line_ring.print_sensor_debug()
            
            print("-" * 80)
            
            time.sleep(0.1)  # 10Hz for debug mode
            
    except KeyboardInterrupt:
        print("\nDebug mode stopped")

if __name__ == "__main__":
    print("LineRing and Compass Test")
    print("=" * 40)
    print("1. Normal test (30Hz)")
    print("2. Debug mode (detailed sensors)")
    print("3. Exit")
    
    choice = input("Choose option (1-3): ").strip()
    
    if choice == "1":
        test_line_and_compass()
    elif choice == "2":
        test_sensors_debug()
    elif choice == "3":
        print("Goodbye!")
    else:
        print("Invalid choice. Running normal test...")
        test_line_and_compass()
