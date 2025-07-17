
import sys
import time
from components.Wire import wire
from components.Motor import Motor
from components.M2006 import M2006

motor = M2006(
    i2c_address=31,
    wire=wire,
    angle_offset=0,
    current_limit_amps=5,
    elec_angle_offset=1402861312,
    sincos_center=1237,
    polarity=-1
)

print(motor.get_speed_rps())