# Converts Python ints to C sized ints
def int8(n): return max(min(int(n), 0x7F), -(0x80))
def int16(n): return max(min(int(n), 0x7FFF), -(0x8000))
def int32(n): return max(min(int(n), 0x7FFFFFFF), -(0x80000000))

# Converts Python ints to C sized uints
def uint8(n): return max(min(int(n), 0xFF), 0)
def uint16(n): return max(min(int(n), 0xFFFF), 0)
def uint32(n): return max(min(int(n), 0xFFFFFFFF), 0)

# Converts Python floats to C floats
from numpy import float32 as np_float32
from ctypes import c_int32
def float32(n): return int.from_bytes(np_float32(n).tobytes(), byteorder='little', signed=True)


#

class M2006Driver:
    def __init__(self):
        self.i2c_hardware = None
        self.i2c_address = 0
        self.QDRformat = 0
        self.QDRposition = 0
        self.QDRspeed = 0
        self.QDRERROR1 = 0
        self.QDRERROR2 = 0

    def begin(self, address, wire):
        self.i2c_hardware = wire
        self.i2c_address = address
        self.QDRformat = 0
        return True

    def get_firmware_version(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x00)
        self.i2c_hardware.end_transmission()
        self.i2c_hardware.request_from(self.i2c_address, 4)
        version = self.receive_32bit_value()
        return version

    def set_iq_pid_constants(self, kp, ki):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x40)
        self.send_32bit_value(int32(kp))
        self.send_32bit_value(int32(ki))
        self.i2c_hardware.end_transmission()

    def set_id_pid_constants(self, kp, ki):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x41)
        self.send_32bit_value(int32(kp))
        self.send_32bit_value(int32(ki))
        self.i2c_hardware.end_transmission()

    def set_speed_pid_constants(self, kp, ki, kd):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x42)
        self.send_32bit_value(float32(kp))
        self.send_32bit_value(float32(ki))
        self.send_32bit_value(float32(kd))
        self.i2c_hardware.end_transmission()

    def set_position_pid_constants(self, kp, ki, kd):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x43)
        self.send_32bit_value(float32(kp))
        self.send_32bit_value(float32(ki))
        self.send_32bit_value(float32(kd))
        self.i2c_hardware.end_transmission()

    def set_position_region_boundary(self, boundary):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x44)
        self.send_32bit_value(float32(boundary))
        self.i2c_hardware.end_transmission()

    def configure_operating_mode_and_sensor(self, operating_mode, sensor_type):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x20)
        self.i2c_hardware.write(uint8(operating_mode + (sensor_type << 4)))
        self.i2c_hardware.end_transmission()

    def configure_command_mode(self, command_mode):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x21)
        self.i2c_hardware.write(uint8(command_mode))
        self.i2c_hardware.end_transmission()

    def set_voltage(self, voltage):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x13)
        self.send_32bit_value(int32(voltage))
        self.i2c_hardware.end_transmission()

    def set_torque(self, torque):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x12)
        self.send_32bit_value(int32(torque))
        self.i2c_hardware.end_transmission()

    def set_speed(self, speed):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x11)
        self.send_32bit_value(int32(speed))
        self.i2c_hardware.end_transmission()

    def set_position(self, position, elec_angle):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x10)
        self.send_32bit_value(uint32(position))
        self.send_8bit_value(uint8(elec_angle))
        self.i2c_hardware.end_transmission()

    def set_current_limit_foc(self, current):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x32)
        self.send_32bit_value(int32(current))
        self.i2c_hardware.end_transmission()

    def set_speed_limit(self, speed):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x33)
        self.send_32bit_value(int32(speed))
        self.i2c_hardware.end_transmission()

    def clear_faults(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x01)
        self.i2c_hardware.end_transmission()

    def set_elec_angle_offset(self, elec_angle_offset):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x32)
        self.send_32bit_value(uint32(elec_angle_offset))
        self.i2c_hardware.end_transmission()

    def set_eaoper_speed(self, eaoper_speed):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x31)
        self.send_32bit_value(int32(eaoper_speed))
        self.i2c_hardware.end_transmission()

    def set_sincos_center(self, sincos_center):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x30)
        self.send_32bit_value(int32(sincos_center))
        self.i2c_hardware.end_transmission()

    def set_calibration_options(self, voltage, speed, s_cycles, cycles):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x3A)
        self.send_32bit_value(uint32(voltage))
        self.send_32bit_value(int32(speed))
        self.send_32bit_value(uint32(s_cycles))
        self.send_32bit_value(uint32(cycles))
        self.i2c_hardware.end_transmission()

    def start_calibration(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x38)
        self.i2c_hardware.write(uint8(0x01))
        self.i2c_hardware.end_transmission()

    def stop_calibration(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x38)
        self.i2c_hardware.write(uint8(0x00))
        self.i2c_hardware.end_transmission()

    def is_calibration_finished(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x39)
        self.i2c_hardware.end_transmission()
        self.i2c_hardware.request_from(self.i2c_address, 9)

        calibration_state = self.receive_8bit_value()
        elec_angle_offset = self.receive_32bit_value()
        sincos_center = self.receive_32bit_value()

        return calibration_state == 255

    def get_calibration_elec_angle_offset(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x39)
        self.i2c_hardware.end_transmission()
        self.i2c_hardware.request_from(self.i2c_address, 9)

        calibration_state = self.receive_8bit_value()
        elec_angle_offset = self.receive_32bit_value()
        self.receive_32bit_value()  # sincos_center (unused)

        return elec_angle_offset if calibration_state == 255 else 0

    def get_calibration_sincos_center(self):
        self.i2c_hardware.begin_transmission(self.i2c_address)
        self.i2c_hardware.write(0x39)
        self.i2c_hardware.end_transmission()
        self.i2c_hardware.request_from(self.i2c_address, 9)

        calibration_state = self.receive_8bit_value()
        self.receive_32bit_value()  # elec_angle_offset (unused)
        sincos_center = self.receive_32bit_value()

        return sincos_center if calibration_state == 255 else 0

    def update_quick_data_readout(self):
        if self.QDRformat == 0:
            self.i2c_hardware.set_i2c_address(self.i2c_address)

            self.i2c_hardware.request_from(self.i2c_address, 10)

            self.QDRposition = self.receive_32bit_value()
            print('pos:', self.QDRposition)
            # qdrspeed is a signed int, but it's getting interpreted as an unsigned one
            QDRspeed = self.receive_32bit_value()
            self.QDRspeed = c_int32(QDRspeed).value
            # self.QDRspeed = QDRspeed
            print('speed:', self.QDRspeed, QDRspeed)
            self.QDRERROR1 = self.receive_8bit_value()
            self.QDRERROR2 = self.receive_8bit_value()

    def get_QDR_position(self):
        return self.QDRposition

    def get_QDR_speed(self):
        return self.QDRspeed

    def get_QDR_errors(self):
        return self.QDRERROR1, self.QDRERROR2

    def send_8bit_value(self, value):
        self.i2c_hardware.write(value & 0xFF)

    def send_16bit_value(self, value):
        self.i2c_hardware.write(value & 0xFF)
        self.i2c_hardware.write((value >> 8) & 0xFF)

    def send_32bit_value(self, value):
        self.i2c_hardware.write(value & 0xFF)
        self.i2c_hardware.write((value >> 8) & 0xFF)
        self.i2c_hardware.write((value >> 16) & 0xFF)
        self.i2c_hardware.write((value >> 24) & 0xFF)

    def receive_8bit_value(self):
        value = 0
        value = self.i2c_hardware.read()
        return value

    def receive_16bit_value(self):
        value = 0
        value = self.i2c_hardware.read()
        value += self.i2c_hardware.read() << 8
        return value

    def receive_32bit_value(self):
        value = 0
        value = self.i2c_hardware.read()
        value += self.i2c_hardware.read() << 8
        value += self.i2c_hardware.read() << 16
        value += self.i2c_hardware.read() << 24
        return value