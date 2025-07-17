class BallDetector:
    def __init__(self, components, subsystems):
        self.components = components
        self.subsystems = subsystems

    def detect_ball(self):
        # print("Detecting ball")

        objects = self.subsystems["ObjectDetection"].get_all_positions()

        if objects["ball"] is not None:
            coordinates = objects["ball"]

            polar_coordinates = self.subsystems["PolarMapper"].map(*coordinates)

            return polar_coordinates
        else:
            return None

