import math

class PolarMapper:
    def __init__(self, components, subsystems):
        self.components = components
        self.subsystems = subsystems

        self.origin = (0, 0)
        self.angle_offset = 0
    
    def set_origin(self, x, y):
        self.origin = (x, y)
    
    def set_angle_offset(self, angle):
        self.angle_offset = angle

    def map(self, x, y):
        angle = math.atan2(y - self.origin[1], x - self.origin[0]) * 180 / math.pi - self.angle_offset
        distance = math.sqrt((x - self.origin[0])**2 + (y - self.origin[1])**2)
        return (angle, distance)
