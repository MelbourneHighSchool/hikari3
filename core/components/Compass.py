# The CompassSensor class offers an interface to the BNO085 9-DOF IMU from Adafruit
# Use get_heading() to get the current heading between 0 to 360

import time
import board
import busio
import math
from adafruit_bno08x import (
    # BNO_REPORT_GAME_ROTATION_VECTOR,
    BNO_REPORT_ROTATION_VECTOR,
)
from adafruit_bno08x.i2c import BNO08X_I2C
from scipy.spatial.transform import Rotation as R

class Compass:
    def __init__(self):
        i2c = busio.I2C(board.SCL, board.SDA)
        self.bno = BNO08X_I2C(i2c)
        
        self.bno.enable_feature(BNO_REPORT_ROTATION_VECTOR)

        self.last_valid_heading = None
        self.max_retries = 3
        self.zero_offset = 0  # Initialize zero offset

    def zero(self):
        """
        Set the current heading as the zero point.
        """
        current_heading = self.get_raw_heading()
        if current_heading is not None:
            self.zero_offset = current_heading
            print(f"Compass zeroed. Offset set to {self.zero_offset} degrees.")
        else:
            print("Failed to zero compass. Couldn't get a valid heading.")

    def get_raw_heading(self):
        """
        Get the raw heading without applying the zero offset.
        """
        for _ in range(self.max_retries):
            try:
                a, b, c, d = self.bno.quaternion

                yaw_deg = c
                heading = (360 - yaw_deg + 720) % 360
                
                self.last_valid_heading = heading
                return heading

            except Exception as e:
                print(f"Error in get_raw_heading: {e}. Retrying...")
        
        print("Failed to get heading after multiple attempts")
        return self.last_valid_heading

    def get_heading(self):
        """
        Get the heading, applying the zero offset.
        """
        raw_heading = self.get_raw_heading()
        if raw_heading is None:
            return None
        return (raw_heading - self.zero_offset + 360) % 360

    def get_signed_heading(self):
        heading = self.get_heading()
        if heading is None:
            return None
        return ((heading + 180) % 360) - 180

# code to test compass
if __name__ == "__main__":
    compass = Compass()
    print("Initial readings:")
    for _ in range(5):
        heading = compass.get_heading()
        print(f"Heading: {heading}")
        time.sleep(0.5)

    input("Press Enter to zero the compass...")
    compass.zero()

    print("\nReadings after zeroing:")
    for _ in range(5):
        heading = compass.get_heading()
        print(f"Heading: {heading}")
        time.sleep(0.5)
