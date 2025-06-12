import numpy as np

class Rotation:
    def __init__(self, speed):
        # Speed is measured in rotations per second, of the entire robot

        # Can be calculated by 
        # Circumference/arc length: 2 pi * distance of wheels to centre: 2 * pi * 85mm
        # Rotations per second of motor: n
        # Wheel diameter: 65mm
        # Distance traversed per second of motor: n * 65mm * pi
        # seconds taken to rotate once: circumference / distance traversed
        # = 2 * pi * 85 / (n * 65 * pi)
        # = 2 * 85 / 65 / n
        # amount of times we can rotate per second
        # = n / (2 * 85 / 65)    , n being the rotations per second of the motor
        # = n / (2.61538461538)    , n being the rotations per second of the motor

        self.speed = speed

    