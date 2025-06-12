# The TwoWire class is a Python implementation of the one offered by Arduino's <Wire.h> library
# The usage and operation should be the same as the Arduino one

import os
import fcntl
import struct

class TwoWire:
    def __init__(self, i2c_file):
        self.i2c_file = i2c_file
        self.write_buffer = bytearray()
        self.read_buffer = bytearray()
    
    def set_i2c_address(self, i2c_address):
        fcntl.ioctl(self.i2c_file, 0x0703, i2c_address)  # 0x0703 is I2C_SLAVE in <linux/i2c-dev.h>

    def begin_transmission(self, i2c_address):
        fcntl.ioctl(self.i2c_file, 0x0703, i2c_address)  # 0x0703 is I2C_SLAVE in <linux/i2c-dev.h>
        self.write_buffer.clear()

    def end_transmission(self):
        os.write(self.i2c_file, self.write_buffer)
        self.write_buffer.clear()

    def write(self, value):
        self.write_buffer.append(value & 0xFF)

    def read(self):
        result = self.read_buffer[0]
        self.read_buffer = self.read_buffer[1:]
        return result

    def request_from(self, i2c_address, bytes, stop_bit=True):
        self.read_buffer = os.read(self.i2c_file, bytes)