import sys
import time
from components.Wire import wire
from components.M2006 import M2006

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python set_motor_speed.py <speed_rps>")
        sys.exit(1)
    try:
        speed_rps = float(sys.argv[1])
    except ValueError:
        print("Invalid speed value. Please provide a number.")
        sys.exit(1)

    # These values should match the config for motor with I2C 28 in your robot profile
    motor = M2006(
        i2c_address=28,
        wire=wire,
        angle_offset=0,  # Example value, adjust if needed
        current_limit_amps=4,
        # elec_angle_offset=238026496,
        elec_angle_offset=  1208242944,
        sincos_center=1237,
        polarity=-1
    )

    print(f"Setting motor (I2C 28) speed to {speed_rps} rps...")
    motor.set_speed_rps(speed_rps)