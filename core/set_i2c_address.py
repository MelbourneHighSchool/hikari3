from components.MotorDriver import MotorDriver
from components.Motor import Motor
from components.Wire import wire
import time

# Example usage of MotorDriver to set the I2C address

def main():
    # Initialize the I2C hardware interface (this is a placeholder, replace with actual implementation)
    motor_driver = MotorDriver(i2c_address=0x18, wire=wire)  # Initialize with default address
    print('Firmware version: ', motor_driver.get_firmware_version())
    
    
    # Updated PID and configuration values to match demo.py
    motor_driver.set_current_limit_foc(int(5 * 65536))
    motor_driver.set_id_pid_constants(1600, 240)
    motor_driver.set_iq_pid_constants(1600, 240)
    motor_driver.set_speed_pid_constants(1e-1, 1e-3, 6e-2)

    print('Set 1')

    # Updated sensor configuration to match demo.py
    motor_driver.set_sensor_angle_offset_direction(175907840, 1)
    motor_driver.set_sensor_offset(1240, 1240)

    motor_driver.configure_operating_mode_and_sensor(3, 1)  # FOC mode and sin/cos encoder
    motor_driver.configure_command_mode(12)  # Speed command mode

    motor_driver.set_speed(-0 * 458752)


    # items and their bit masks for the format 
    # err1: 0x00000001
    # err2: 0x00000002
    # position: 0x00000010 
    # speed: 0x00000040
    # current: 0x00002000 

    qdr_format = 0x00000001 | 0x00000002 | 0x00000010 | 0x00000040
    motor_driver.configure_qdr_format(qdr_format)


    print(f"Initialised motor at address, firmware version: {motor_driver.get_firmware_version()}")

    motor_driver.set_i2c_address(35, 255)

    # while True:
    #     print('Speed: ', motor_driver.get_qdr_speed())
    #     time.sleep(0.1)


if __name__ == '__main__':
    main()
