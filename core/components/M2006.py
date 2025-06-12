from .M2006Driver import M2006Driver


class M2006:
    pos_per_rps = 60 * 65536 * 4.2

    def __init__(self, i2c_address, wire, angle_offset, current_limit_amps, elec_angle_offset, sincos_center, polarity):        
        self.motor_driver = M2006Driver()
        self.polarity = polarity
        
        self.angle_offset = angle_offset # e.g. in an equal 90deg X shape, -45 for front left, 45 for front right, 135 for back right, -135 for back left


        self.motor_driver.begin(i2c_address, wire)
        # print(f"[{i2c_address}] Motor driver version: {self.motor_driver.get_firmware_version()}")

        self.motor_driver.set_current_limit_foc(int(current_limit_amps * 65536))
        self.motor_driver.set_id_pid_constants(1500, 200)
        self.motor_driver.set_iq_pid_constants(1500, 200)
        self.motor_driver.set_speed_pid_constants(4e-2, 4e-4, 3e-2)
        self.motor_driver.set_elec_angle_offset(elec_angle_offset)
        self.motor_driver.set_sincos_center(sincos_center)

        self.motor_driver.configure_operating_mode_and_sensor(3, 1)
        self.motor_driver.configure_command_mode(12)

        self.motor_driver.set_speed(0)

    def set_speed_rps(self, speed_rps):
        self.motor_driver.set_speed(int(speed_rps * self.pos_per_rps * self.polarity))

    def get_speed_rps(self):
        self.motor_driver.update_quick_data_readout()
        return self.motor_driver.get_QDR_speed() / self.pos_per_rps * self.polarity