from .M2006 import M2006

class Dribbler:
    """
    Dribbler class to control the ball dribbling mechanism.
    """
    def __init__(self, motor):
        """
        Initialize the dribbler motor.
        
        Args:
            wire: The wire object for I2C communication
            i2c_address: The I2C address of the dribbler motor (default: 31)
            current_limit_amps: Current limit in amps (default: 2)
            elec_angle_offset: Electrical angle offset (default: 1325600000)
            enc1_offset: Encoder 1 offset (default: 1240)
            sensor_direction: Sensor direction (default: -1)
        """
        self.motor = motor
        self.current_speed = 0
        
    def set_speed(self, speed):
        """
        Set the speed of the dribbler.
        
        Args:
            speed: Speed value from 0 to 1, where 0 is stopped and 1 is maximum speed
        
        Returns:
            None
        """
        # Clamp speed between 0 and 1
        speed = max(0, min(1, speed))
        
        motor_rps = 7 * speed
        
        # Set the motor speed
        self.motor.set_speed_rps(motor_rps)
        self.current_speed = speed
        
    def stop(self):
        """
        Stop the dribbler.
        
        Returns:
            None
        """
        self.set_speed(0)