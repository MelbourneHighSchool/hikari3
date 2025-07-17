
import sys
import time
from components.Wire import wire
from components.Motor import Motor
from components.M2006 import M2006

motor = M2006(
    i2c_address=0x1a,
    wire=wire,
    angle_offset=0,
    current_limit_amps=5,
    elec_angle_offset=1502516480,
    sincos_center=1247,
    polarity=-1
)

motor.set_speed_rps(float(sys.argv[1]))
