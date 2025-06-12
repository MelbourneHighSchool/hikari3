# Barebones.py
# Description: This is an overseer that does not require a kicker, dribbler, or compass, just a camera
# Requirements:
#   - subsystem: ObjectDetection
#   - subsystem: Drivetrain

import asyncio
import numpy as np
import math
import time
from utils.PID import PID
from utils.math import point_to_segment_distance

class Defender:
    def __init__(self, components, subsystems):
        self.components = components
        self.subsystems = subsystems

        
        self.targetGoal = "blueGoal"
        self.ownGoal = "yellowGoal"

        self.components["Compass"].zero()

        # Initialize PIDs
        self.compass_pid = PID(0.05, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))
        self.target_goal_pid = PID(0.035, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))
        self.ball_pid = PID(0.035, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))

        # Add variables to track last known ball position
        self.last_ball_position = None
        self.last_ball_time = 0
        self.ball_memory_duration = 1.0  # Remember ball position for 1 second

        # Get robot profile and camera config
        self.robot_profile = self.subsystems["AppdataManager"].robot_profile
        self.camera_config = self.robot_profile['camera']
        self.center = (int(self.camera_config['centre']['x']), int(self.camera_config['centre']['y']))
        self.capturezone = self.robot_profile['capturezone']

        # Register frame callback
        self.subsystems["ObjectDetection"].add_frame_callback(self._process_frame)

    def _process_frame(self, rgb_array, detected_objects):
        """
        Process each frame and update robot behavior based on detected objects.
        """
        try:
            # Check if in manual mode

            # Get compass heading
            compass = self.components["Compass"]
            heading = compass.get_signed_heading()
            v = self.compass_pid(heading)

            # Initialize variables
            pos_e_x = 0
            pos_e_y = 0
            pos_e_num = 0
            rotation = 0
            speed = 0
            direction = 0
            kick = False

            # Process target goal
            targetGoal = self.targetGoal
            ownGoal = self.ownGoal
            
            tg_distance = 400
            tg_real_distance = 200
            tg_angle = None

            if detected_objects[targetGoal] is not None:
                x, y = detected_objects[targetGoal]
                x -= self.center[0]
                y -= self.center[1]
            
                tg_distance = (x ** 2 + y ** 2) ** (1/2)
                tg_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading

                if tg_angle > 180: tg_angle -= 360
                if tg_angle < -180: tg_angle += 360

                tg_real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * tg_distance)

                if tg_real_distance < 0: tg_real_distance = 10000
                if tg_real_distance > 10000: tg_real_distance = 10000

                # print("tg", tg_angle, tg_real_distance)

                if tg_real_distance < 1500:
                    northed_tgar = (tg_angle + heading) * (math.pi / 180)
                    pos_e_num += 1
                    pos_e_x += -1 * tg_real_distance * math.sin(northed_tgar)
                    pos_e_y += tg_real_distance * math.cos(northed_tgar)

            if pos_e_num > 0:
                pos_e_x /= pos_e_num
                pos_e_y /= pos_e_num
            
            # print(f"predicted pos: {pos_e_x}, {pos_e_y}")

            rotation = v
            cz_distance = 9999

            # Process ball detection
            current_time = time.time()
            ball_detected = detected_objects["ball"] is not None
            
            if ball_detected:
                self.last_ball_position = detected_objects["ball"]
                self.last_ball_time = current_time
            
            ball_position = None
            if ball_detected:
                ball_position = detected_objects["ball"]
            elif (self.last_ball_position is not None and 
                  current_time - self.last_ball_time < self.ball_memory_duration):
                ball_position = self.last_ball_position
                print(f"Using last known ball position from {current_time - self.last_ball_time:.2f}s ago")
            
            if ball_position is not None:
                # Get goal distance from ObjectDetection subsystem
                gdist = self.subsystems["ObjectDetection"].ownGoalClosestDistance
                
                x, y = ball_position
                cz_distance = point_to_segment_distance(x, y, 
                    self.capturezone['x1'], self.capturezone['y1'], 
                    self.capturezone['x2'], self.capturezone['y2'])

                x -= self.center[0]
                y -= self.center[1]
            
                ball_distance = (x ** 2 + y ** 2) ** (1/2)
                ball_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading
                real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * ball_distance)

                if real_distance < 0: real_distance = 10000
                if real_distance > 10000: real_distance = 10000

                # print(f"Ball angle: {ball_angle}, Ball distance: {ball_distance}px / {real_distance}mm, cz_distance: {cz_distance}")

                # if tg_angle is not None:
                #     ball_angle = ball_angle - tg_angle

                if ball_angle > 180:
                    ball_angle -= 360
                elif ball_angle < -180:
                    ball_angle += 360

                og_distance = None
                og_angle = None

                
                if detected_objects[ownGoal] is not None:
                    x, y = detected_objects[ownGoal]
                    x -= self.center[0]
                    y -= self.center[1]

                    og_distance = (x ** 2 + y ** 2) ** (1/2)
                    og_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading

                    if og_angle > 180: og_angle -= 360
                    if og_angle < -180: og_angle += 360

                    og_real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * og_distance)

                    if og_real_distance < 0: og_real_distance = 10000
                    if og_real_distance > 10000: og_real_distance = 10000

                    # print("tg", tg_angle, tg_real_distance)

                    if og_real_distance < 1500:
                        northed_ogar = (og_angle + heading) * (math.pi / 180)
                        pos_e_num += 1
                        pos_e_x += -1 * og_real_distance * math.sin(northed_ogar)
                        pos_e_y += og_real_distance * math.cos(northed_ogar)


                # Get goal distance and angle from ObjectDetection subsystem
                gdist = self.subsystems["ObjectDetection"].ownGoalClosestDistance
                goal_angle = og_angle


                # Calculate vertical component based on goal distance
                vertical_speed = 0
                if gdist < 400:
                    vertical_speed = 0.5
                elif gdist > 440:
                    vertical_speed = -0.1


                
                # Calculate horizontal component based on ball angle
                horizontal_speed = 0
                if ball_angle < -10:
                    horizontal_speed = 3

                    if goal_angle > -150:
                        print("EXCEED A")
                        horizontal_speed = -2
                        vertical_speed = 0
                elif ball_angle > 10:
                    horizontal_speed = -3

                    if goal_angle < 150:
                        print("EXCEED B")
                        horizontal_speed = 2
                        vertical_speed = 0
                print('ball:', ball_angle, 'goal:', goal_angle, 'hori:', horizontal_speed)



                # Combine components into a single vector
                if horizontal_speed != 0 or vertical_speed != 0:
                    # Calculate the angle of the combined vector
                    direction = math.degrees(math.atan2(vertical_speed, horizontal_speed))
                    # Calculate the magnitude of the combined vector
                    speed = math.sqrt(horizontal_speed**2 + vertical_speed**2)


                else:
                    direction = 0
                    speed = 0

                rotation = v

                ##########
            #######

                print(ball_angle, self.subsystems["Drivetrain"].manual)

                if ball_angle < -10:
                    # print('left!')
                    direction = -90
                    speed = 5
                
                elif ball_angle > 10:
                    # print('right!')
                    direction = 90
                    speed = 5

                print('dist:', self.subsystems["ObjectDetection"].ownGoalClosestDistance)

                gdist = self.subsystems["ObjectDetection"].ownGoalClosestDistance

                if gdist < 340:
                    direction = 0
                    speed = 1
                
                elif gdist > 370:
                    direction = 180
                    speed = 1
                
                rotation = v

                ##########
                
            else:
                pass
                # direction = 180
                # speed = 0.5

            if cz_distance < 20:
                kick = True

            # print(v)
            # print(direction - heading)

            if self.subsystems["Drivetrain"].manual == False:    
                self.subsystems["Drivetrain"].quickdrive_with_compass_north(direction, speed, -rotation, heading)

                if kick: 
                    self.components["Kicker"].kick()

        except Exception as e:
            print("ERROR in frame processing")
            print(e)