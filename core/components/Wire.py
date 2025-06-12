# Wire.py exports I2C1 as a TwoWire

import os
from .TwoWire import TwoWire

f = os.open("/dev/i2c-1", os.O_RDWR)
wire = TwoWire(f)