# The Motor class offers a simple interface to set and read the speed of motors
# Uses the MotorDriver class to control the motors

from .MotorDriver import MotorDriver

class Motor:
    pos_per_rps = 458752 # M3508 motor
   
    def __init__(self, i2c_address, wire, angle_offset, current_limit_amps, elec_angle_offset, sensor_direction, enc1_offset, enc2_offset):
        # self.motor_driver = MotorDriver() # OLD
        self.motor_driver = MotorDriver(i2c_address, wire) # NEW
        self.polarity = sensor_direction  # renamed polarity to sensor_direction to match demo.py

        self.angle_offset = angle_offset # e.g. in an equal 90deg X shape, -45 for front left, 45 for front right, 135 for back right, -135 for back left

        # self.motor_driver.begin(i2c_address, wire) # OLD
        # print(f"[{i2c_address}] Motor driver version: {self.motor_driver.get_firmware_version()}")

        # Updated PID and configuration values to match demo.py
        self.motor_driver.set_current_limit_foc(int(current_limit_amps * 65536))
        self.motor_driver.set_id_pid_constants(1600, 240)
        self.motor_driver.set_iq_pid_constants(1600, 240)
        self.motor_driver.set_speed_pid_constants(1e-1, 1e-3, 6e-2)

        # Updated sensor configuration to match demo.py
        self.motor_driver.set_sensor_angle_offset_direction(elec_angle_offset, sensor_direction)
        self.motor_driver.set_sensor_offset(enc1_offset, enc2_offset)

        self.motor_driver.configure_operating_mode_and_sensor(3, 1)  # FOC mode and sin/cos encoder
        self.motor_driver.configure_command_mode(12)  # Speed command mode

        self.motor_driver.set_speed(0)

        print(f"Initialised motor at address {i2c_address}, firmware version: {self.motor_driver.get_firmware_version()}")

    def set_speed_rps(self, speed_rps):
        self.motor_driver.set_speed(int(speed_rps * self.pos_per_rps * self.polarity))

    def get_speed_rps(self):
        self.motor_driver.update_quick_data_readout()
        return self.motor_driver.get_qdr_speed() / self.pos_per_rps * self.polarity