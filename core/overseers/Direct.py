# Flyby.py
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
import cv2
from subsystems.ObjectDetection import pixels_to_mm

class Direct:
    def __init__(self, components, subsystems):
        print('me myself flyby!!')

        # Set default target goal to blue
        self.targetGoal = "blueGoal"
        self.ownGoal = "yellowGoal"

        self.components = components
        self.subsystems = subsystems

        if "Compass" in self.components:
            self.components["Compass"].zero()
 
        # Initialize PIDs
        self.compass_pid = PID(0.02, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))
        self.target_goal_pid = PID(0.02, 0.0, 0.0, setpoint=0, output_limits=(-1.2, 1.2))
        self.ball_pid = PID(0.015, 0.0, 0.0, setpoint=0, output_limits=(-2, 2))
        self.preciser_ball_pid = PID(0.015, 0.0, 0.0, setpoint=0, output_limits=(-2.5, 2.5))

        # Add line touch handling variables
        self.last_line_touch_time = 0
        self.line_touch_duration = 0.5  # Duration in seconds to maintain zero speed

        # Add variables to track last known ball position
        self.last_ball_position = None
        self.last_ball_time = 0
        self.ball_memory_duration = 0.5  # Remember ball position for 0.5 second

        # Get robot profile and camera config
        self.robot_profile = self.subsystems["AppdataManager"].robot_profile
        self.camera_config = self.robot_profile['camera']
        self.center = (int(self.camera_config['centre']['x']), int(self.camera_config['centre']['y']))
        self.capturezone = self.robot_profile['capturezone']

        # Register frame callback
        self.subsystems["ObjectDetection"].add_frame_callback(self._process_frame)
        print('registered frame callback')

        self.subsystems["Drivetrain"].quickdrive(0, 0, 0)

        self.last_5_ball_capture_values = [0, 0, 0, 0, 0]

    def _process_frame(self, rgb_array, detected_objects):
        """
        Process each frame and turn the robot to face the ball if detected.
        When the ball is in front, drive towards it.
        """
        try:
            # print('proc frame')

            # Get compass heading
            # heading = self.components["Compass"].get_signed_heading()

            actual_dribbler_speed = self.components["Dribbler"].get_speed_rps()
            
            set_dribbler_speed = 0

            ball_captured = False

            kick = False

            # print(f"{actual_dribbler_speed:2f}")

            object_detection = self.subsystems["ObjectDetection"]
            # print("ball capture pixel: ", ball_capture_pixel)       
            # 
                 


            ball_special_found = object_detection.ball_special_found
            ball_special_x = object_detection.ball_special_x
            ball_special_y = object_detection.ball_special_y

            directly_in_front = False

            if ball_special_found:
                # print(f'special, {ball_special_x}')
                if ball_special_x < 10 and -50 < ball_special_y < 50:
                    ball_captured = True


                elif -15 < ball_special_y < 15:
                    directly_in_front = True




            # goal stuff

            blue_goal_found = False
            yellow_goal_found = False


            if "yellowGoal" in detected_objects and detected_objects["yellowGoal"] is not None:
                yellow_goal_found = True

                yellow_goal_distance_mm = object_detection.yellowGoalClosestDistanceMM
                yellow_goal_x, yellow_goal_y = detected_objects["yellowGoal"]
                yellow_goal_x -= self.center[0]
                yellow_goal_y -= self.center[1]

                yellow_goal_angle = (math.atan2(yellow_goal_y, yellow_goal_x) * 180 / math.pi) + 90

                # Normalize angle to -180 to 180 range
                if yellow_goal_angle > 180:
                    yellow_goal_angle -= 360
                elif yellow_goal_angle < -180:
                    yellow_goal_angle += 360

                yellow_goal_angle = -yellow_goal_angle  # because mirror flips everything
                yellow_goal_angle = yellow_goal_angle - float(self.camera_config['forwardangle'])
                yellow_goal_angle = yellow_goal_angle + 180

                # Normalize angle to -180 to 180 range
                if yellow_goal_angle > 180:
                    yellow_goal_angle -= 360
                elif yellow_goal_angle < -180:
                    yellow_goal_angle += 360
                
                # print("Yellow goal: angle", yellow_goal_angle, "distance", yellow_goal_distance_mm)

            if "blueGoal" in detected_objects and detected_objects["blueGoal"] is not None:
                blue_goal_found = True

                blue_goal_distance_mm = object_detection.blueGoalClosestDistanceMM
                blue_goal_x, blue_goal_y = detected_objects["blueGoal"]
                blue_goal_x -= self.center[0]
                blue_goal_y -= self.center[1]

                blue_goal_angle = (math.atan2(blue_goal_y, blue_goal_x) * 180 / math.pi) + 90

                # Normalize angle to -180 to 180 range
                if blue_goal_angle > 180:
                    blue_goal_angle -= 360
                elif blue_goal_angle < -180:
                    blue_goal_angle += 360

                blue_goal_angle = -blue_goal_angle  # because mirror flips everything
                blue_goal_angle = blue_goal_angle - float(self.camera_config['forwardangle'])
                blue_goal_angle = blue_goal_angle + 180

                # Normalize angle to -180 to 180 range
                if blue_goal_angle > 180:
                    blue_goal_angle -= 360
                elif blue_goal_angle < -180:
                    blue_goal_angle += 360
                
                # print("Blue goal: angle", blue_goal_angle, "distance", blue_goal_distance_mm)


            if yellow_goal_found and blue_goal_found:
                # Calculate the angle and magnitude of the average vector between the two goals

                def to_radians(degrees):
                    return degrees / 180 * math.pi                    
                
                yellow_goal_components = (yellow_goal_distance_mm * math.sin(to_radians(yellow_goal_angle)), yellow_goal_distance_mm * math.cos(to_radians(yellow_goal_angle)))
                blue_goal_components = (blue_goal_distance_mm * math.sin(to_radians(blue_goal_angle)), blue_goal_distance_mm * math.cos(to_radians(blue_goal_angle)))

                # print(f"yellow angle {yellow_goal_angle:.2f} dist {yellow_goal_distance_mm:.2f} comp: ({yellow_goal_components[0]:.2f}, {yellow_goal_components[1]:.2f})")
                # print(f"blue angle {blue_goal_angle:.2f} dist {yellow_goal_angle:.2f} comp: ({blue_goal_components[0]:.2f}, {blue_goal_components[1]:.2f})")
                
                avg_x = (yellow_goal_components[0] + blue_goal_components[0]) / 2
                avg_y = (yellow_goal_components[1] + blue_goal_components[1]) / 2

                # print(f'avgx avgy {avg_x:.2f} {avg_y:.2f}')

                avg_components = (avg_x, avg_y)

                avg_angle = math.atan2(avg_y, avg_x) * 180 / math.pi

                # Normalize angle to -180 to 180 range

                # Normalize angle to -180 to 180 range
                if avg_angle > 180:
                    avg_angle -= 360
                elif avg_angle < -180:
                    avg_angle += 360


                draw_angle = -avg_angle + float(self.camera_config['forwardangle'])


                avg_angle = draw_angle
                if avg_angle > 180:
                    avg_angle -= 360
                elif avg_angle < -180:
                    avg_angle += 360


                avg_distance = math.sqrt(avg_x**2 + avg_y**2)

                # print(f"Centre angle: {avg_angle}, distance: {avg_distance}")


                # Draw the centre direction on the image, length 100px
                # Convert angle to radians for math functions
                draw_angle_rad = math.radians(draw_angle)
                # Draw line from center in direction of average angle
                cv2.line(rgb_array, 
                        (self.center[0], self.center[1]), 
                        (int(self.center[0] + 100 * math.cos(draw_angle_rad)), 
                         int(self.center[1] - 100 * math.sin(draw_angle_rad))), 
                        (0, 0, 255), 2)
                # Write it into the bottom left corner of the image
                cv2.putText(rgb_array, f"ca: {avg_angle:.1f}, d: {avg_distance:.1f}", (100, rgb_array.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 1)


            #


            # Only proceed if not in manual mode
            if self.subsystems["Drivetrain"].manual:
                return
            


            #


            # Get compass heading
            compass_angle = self.components["Compass"].get_signed_heading()


            
            # Check for line detection
            if "LineRing" in self.components:
                line_result = self.components["LineRing"].detect_line()
                if line_result['detected']:
                    line_angle = line_result['angle']
                    # Drive in reverse (opposite direction) at speed 1.0
                    reverse_direction = (line_angle + 180) % 360
                    # print(f"Line detected at {line_angle:.2f}°, driving reverse at {reverse_direction:.2f}°")

                    direction = reverse_direction
                    speed = 1.0

                    
                    self.subsystems["Drivetrain"].quickdrive(direction, speed, 0)

                    time.sleep(0.5)
            



            #
            



            

            current_time = time.time()

            # If ball is captured, target the goal
            if ball_captured:
                print('ball captured')

                set_dribbler_speed = 0.5

                target_goal = detected_objects[self.targetGoal]
                print(self.targetGoal, target_goal)
                if target_goal is not None:
                    # Get goal position relative to center
                    x, y = target_goal
                    x -= self.center[0]
                    y -= self.center[1]

                    # Calculate goal angle
                    goal_angle = (math.atan2(y, x) * 180 / math.pi) + 90
                    
                    # Normalize angle to -180 to 180 range
                    if goal_angle > 180:
                        goal_angle -= 360
                    elif goal_angle < -180:
                        goal_angle += 360

                    goal_angle = -goal_angle  # because mirror flips everything
                    goal_angle = goal_angle - float(self.camera_config['forwardangle'])
                    goal_angle = goal_angle + 180
                    
                    # Normalize angle to -180 to 180 range
                    if goal_angle > 180:
                        goal_angle -= 360
                    elif goal_angle < -180:
                        goal_angle += 360

                    print(f"goal_angle: {goal_angle}")

                    # Calculate rotation using PID
                    angle_diff = ((((((goal_angle) + 720)) % 360) + 180) % 360) - 180
                    rotation = -self.target_goal_pid(angle_diff)


                    # If goal is roughly in front of us (within 7 degrees), drive towards it
                    if abs(angle_diff) < 7:
                        speed = 2.0  # Drive at speed 2
                        direction = goal_angle  # Drive in the direction of the goal

                    else:
                        speed = 0  # Just rotate to face the goal
                        direction = 0

                    if abs(angle_diff) < 4:
                        kick=True
                        self.components["Kicker"].kick()

                    # Drive with rotation and optional forward movement
                    self.subsystems["Drivetrain"].quickdrive(direction, speed, -rotation)
                    self.components["Dribbler"].set_speed(set_dribbler_speed)
                    return

            # If we don't have the ball, try to get it
            ball_detected = detected_objects["ball"] is not None

            special_processing = False


            # if not ball_detected:
            #     if ball_special_found:
            #         ball_detected = True
            #         special_processing = True

            if ball_special_found:
                ball_detected = True
                special_processing = True

            
            # Update last known ball position if we see the ball
            if ball_detected:
                self.last_ball_position = detected_objects["ball"]
                self.last_ball_time = current_time
                ball_position = detected_objects["ball"]
            # Use last known position if within memory duration
            elif (self.last_ball_position is not None and 
                  current_time - self.last_ball_time < self.ball_memory_duration):
                ball_position = self.last_ball_position
                print(f"Using last known ball position from {(current_time - self.last_ball_time):.2f}s ago")
            else:
                ball_position = None
                self.last_ball_position = None

            # Process ball position
            if ball_position is not None or special_processing == True:
                ball_angle = 0
                
                if special_processing == False:
                    # Get ball position relative to center
                    x, y = ball_position
                    x -= self.center[0]
                    y -= self.center[1]

                    # Calculate ball angle
                    ball_angle = (math.atan2(y, x) * 180 / math.pi) + 90

                    ball_distance_pixels = math.sqrt(x**2 + y**2)
                    ball_distance_mm = pixels_to_mm(ball_distance_pixels)

                    print(f'ball: {ball_distance_mm}mm')
                    
                    # Normalize angle to -180 to 180 range
                    if ball_angle > 180:
                        ball_angle -= 360
                    elif ball_angle < -180:
                        ball_angle += 360

                    ball_angle = -ball_angle # because mirror flips everything
                    ball_angle = ball_angle - float(self.camera_config['forwardangle'])
                    ball_angle = ball_angle + 180
                    
                    # Normalize angle to -180 to 180 range
                    if ball_angle > 180:
                        ball_angle -= 360
                    elif ball_angle < -180:
                        ball_angle += 360

                    print(f"ball_angle: {ball_angle}")

                elif special_processing == True:
                        if directly_in_front:
                            ball_angle = 0
                        elif ball_special_y > 100:
                            ball_angle = -30
                        elif ball_special_y > 50:
                            ball_angle = -20
                        elif ball_special_y < -50:
                            ball_angle = 20
                        elif ball_special_y < -100:
                            ball_angle = 30
                        elif ball_special_y >= 15:
                            ball_angle = -10
                        elif ball_special_y <= -15:
                            ball_angle = 10
                        
                        ball_distance_pixels = 2
                        ball_distance_mm = 2

                        # print('special angle:', ball_angle)

                # Calculate rotation using PID
                angle_diff = ((((((ball_angle) + 720)) % 360) + 180) % 360) - 180
                rotation = -self.ball_pid(angle_diff)

                # If ball is roughly in front of us (within 30 degrees), drive towards it
                if abs(angle_diff) < 10:
                    speed = 2.0 if ball_special_found else 3.0  # Drive at speed 2
                    direction = ball_angle  # Drive in the direction of the ball
                    set_dribbler_speed = 0.5
                    
                    # Slow down when close to ball
                else:
                    # speed = 0  # Just rotate to face the ball
                    # direction = 0
                    direction = ball_angle
                    # set_dribbler_speed = 0

                    
                    speed = 5.5

                    if abs(ball_angle) > 25:
                        speed = 0

                        # rotation *= 2

                
                if ball_distance_mm < 400:
                    speed = 1.5
                    

                if ball_special_found:
                    set_dribbler_speed = 0.5


                # Drive with rotation and optional forward movement
                self.subsystems["Drivetrain"].quickdrive(direction, speed, -rotation)
                self.components["Dribbler"].set_speed(set_dribbler_speed)

            else:
                # drive towards centre

                if yellow_goal_found and blue_goal_found:
                    self.subsystems["Drivetrain"].quickdrive(avg_angle, 1.0, 0)

                elif yellow_goal_found:
                    self.subsystems["Drivetrain"].quickdrive(yellow_goal_angle, 1.0, 0)

                else:
                    self.subsystems["Drivetrain"].quickdrive(180, 1.0, 0)


            
            if kick == True:
                self.components["Kicker"].kick()

        except Exception as e:
            print("ERROR in frame processing:", e)
            import traceback
            print("Error on line:", traceback.extract_tb(e.__traceback__)[-1].lineno)
