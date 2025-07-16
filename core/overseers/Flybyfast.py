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

class Flybyfast:
    def __init__(self, components, subsystems):
        print('me myself Flybyfast')

        
        self.targetGoal = "yellowGoal"
        self.ownGoal = "blueGoal"

        self.components = components
        self.subsystems = subsystems

        self.components["Compass"].zero()

        # Initialize PIDs
        self.compass_pid = PID(0.02, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))
        self.target_goal_pid = PID(0.02, 0.0, 0.0, setpoint=0, output_limits=(-0.5, 0.5))
        self.ball_pid = PID(0.010, 0.0, 0.0, setpoint=0, output_limits=(-1.5, 1.5))

        # Add line touch handling variables
        self.last_line_touch_time = 0
        self.line_touch_duration = 0.5  # Duration in seconds to maintain zero speed

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
        print('registered frame callback')

    def _process_frame(self, rgb_array, detected_objects):
        """
        Process each frame and update robot behavior based on detected objects.
        """

#         # print('frame frame frame')

#         try:
#             # Check if in manual mode

#             # Get compass heading
#             compass = self.components["Compass"]
#             heading = compass.get_signed_heading()
#             v = self.compass_pid(heading)

#             # Initialize variables
#             pos_e_x = 0
#             pos_e_y = 0
#             pos_e_num = 0
#             rotation = 0
#             speed = 0
#             direction = 0
#             kick = False

#             # Process target goal

#             targetGoal = self.targetGoal
#             ownGoal = self.ownGoal

#             tg_distance = None
#             tg_real_distance = None
#             tg_angle = None


#             ##### OWN GOAL

#             og_distance = None
#             og_angle = None

            
#             if detected_objects[ownGoal] is not None:
#                 x, y = detected_objects[ownGoal]
#                 x -= self.center[0]
#                 y -= self.center[1]

#                 og_distance = (x ** 2 + y ** 2) ** (1/2)
#                 og_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading

#                 if og_angle > 180: og_angle -= 360
#                 if og_angle < -180: og_angle += 360

#                 og_real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * og_distance)

#                 if og_real_distance < 0: og_real_distance = 10000
#                 if og_real_distance > 10000: og_real_distance = 10000

#                 # print("tg", tg_angle, tg_real_distance)

#                 if og_real_distance < 1500:
#                     northed_ogar = (og_angle + heading) * (math.pi / 180)
#                     pos_e_num += 1
#                     pos_e_x += -1 * og_real_distance * math.sin(northed_ogar)
#                     pos_e_y += og_real_distance * math.cos(northed_ogar)


#             ########

            

#             if detected_objects[targetGoal] is not None:
#                 x, y = detected_objects[targetGoal]
#                 x -= self.center[0]
#                 y -= self.center[1]

#                 tg_distance = (x ** 2 + y ** 2) ** (1/2)
#                 tg_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading

#                 if tg_angle > 180: tg_angle -= 360
#                 if tg_angle < -180: tg_angle += 360

#                 tg_real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * tg_distance)

#                 if tg_real_distance < 0: tg_real_distance = 10000
#                 if tg_real_distance > 10000: tg_real_distance = 10000

#                 # print("tg", tg_angle, tg_real_distance)

#                 if tg_real_distance < 1500:
#                     northed_tgar = (tg_angle + heading) * (math.pi / 180)
#                     pos_e_num += 1
#                     pos_e_x += -1 * tg_real_distance * math.sin(northed_tgar)
#                     pos_e_y += tg_real_distance * math.cos(northed_tgar)

#             if pos_e_num > 0:
#                 pos_e_x /= pos_e_num
#                 pos_e_y /= pos_e_num
            
#             # print(f"predicted pos: {pos_e_x}, {pos_e_y}")

#             tg_v = None

#             if tg_angle != None:
#                 tg_v = self.target_goal_pid((((-tg_angle + heading) + 360 + 180) % 360) - 180)
#             print('at least a hello')
#             if tg_v == None:
#                 print('by compass', v, heading)
#                 rotation = v
#             else:
#                 print('by tg', tg_v, tg_angle)
#                 rotation = tg_v
            
#             cz_distance = 9999

#             # Process ball detection
#             current_time = time.time()
#             ball_detected = detected_objects["ball"] is not None
            
#             if ball_detected:
#                 self.last_ball_position = detected_objects["ball"]
#                 self.last_ball_time = current_time
            
#             ball_position = None
#             if ball_detected:
#                 ball_position = detected_objects["ball"]
#             elif (self.last_ball_position is not None and 
#                   current_time - self.last_ball_time < self.ball_memory_duration):
#                 ball_position = self.last_ball_position
#                 print(f"Using last known ball position from {current_time - self.last_ball_time:.2f}s ago")
            
#             if ball_position is not None:
#                 x, y = ball_position
#                 cz_distance = point_to_segment_distance(x, y, 
#                     self.capturezone['x1'], self.capturezone['y1'], 
#                     self.capturezone['x2'], self.capturezone['y2'])

#                 x -= self.center[0]
#                 y -= self.center[1]
            
#                 ball_distance = (x ** 2 + y ** 2) ** (1/2)
#                 ball_angle = (math.atan2(y, x) * 180 / math.pi) + 90 - float(self.camera_config['forwardangle']) + heading
#                 real_distance = 119.11469 * math.tan(0.000458089 * 7.517 * ball_distance)


#                 if real_distance < 0: real_distance = 10000
#                 if real_distance > 10000: real_distance = 10000

#                 if ball_angle > 180:
#                     ball_angle -= 360
#                 elif ball_angle < -180:
#                     ball_angle += 360

#                 v_ball = -self.ball_pid(((((((ball_angle - heading) + 720)) % 360) + 180) % 360) - 180)

#                 print('angle', ((((((ball_angle - heading) + 720)) % 360) + 180) % 360) - 180, 'v_ball', v_ball)
                
#                 if tg_angle == None:
#                     tg_angle = 0

#                 angle_difference = ball_angle - tg_angle

#                 # print('angle_diff', angle_difference, 'heading', heading)


#                 if abs(angle_difference) < 10:
#                     direction = 0
#                     speed = 0

#                     # rotation = v_ball
#                     # print('heading:', heading, 'ball_angle:', ball_angle)
#                     print(v_ball)
#                     if abs(heading - ball_angle) < 10:
#                         direction = ball_angle
#                         speed = 2

#                     print(cz_distance)
#                     if cz_distance < 27:
#                         kick = True
                
#                 else:
#                     if real_distance < 200:
#                         direction = ball_angle + (60 if angle_difference > 0 else -60)
#                         speed = 3
#                     elif real_distance < 280:
#                         direction = ball_angle + (35 if angle_difference > 0 else -35)
#                         speed = 3
#                     else:
#                         direction = ball_angle + (35 if angle_difference > 0 else -35)
#                         speed = 3

#                     if abs(angle_difference) < 30:
#                         speed = 2
                        
#                     if abs(angle_difference) < 20:
#                         speed = 1.3

#                         # direction = ball_angle

                
#                 if cz_distance < 27:
#                     kick = True

#             # else:
#             #     direction = 180
#             #     speed = 0.5

#             # # # Handle line touching with timestamp - moved outside ball detection block
#             # if self.subsystems["ObjectDetection"].touching_line:
#             #     self.last_line_touch_time = current_time
#             #     print("Line touched! doing something for 2 seconds")
            
#             # # Check if we're within the line touch duration
#             # time_since_touch = current_time - self.last_line_touch_time
#             # if time_since_touch < self.line_touch_duration:
#             #     direction = og_angle if og_angle != None else 180
#             #     speed = 1
#             #     rotation = 0
#             #     print('trying to move to own goal', direction)
#             #     print(f"Line touch cooldown: {self.line_touch_duration - time_since_touch:.1f}s remaining")

# ###################3


#             # # Handle line touching with timestamp - moved outside ball detection block
#             if self.subsystems["ObjectDetection"].touching_line:
#                 # self.backtrack_direction
#                 self.last_line_touch_time = current_time
#                 print("Line touched! doing something for 2 seconds")
            


#             # Check if we're within the line touch duration
#             time_since_touch = current_time - self.last_line_touch_time
#             if time_since_touch < self.line_touch_duration:
#             # if True:
#                 direction = None

#                 if og_real_distance == None:
#                     og_real_distance = 10000

#                 if tg_real_distance == None:
#                     tg_real_distance = 10000


#                 forwards_motion = 0

#                 if og_real_distance < tg_real_distance:
#                     forwards_motion = 1
                
#                 elif og_real_distance > tg_real_distance:
#                     forwards_motion = -1

                
#                 leftright_motion = 0

#                 if tg_angle != None:
#                     if tg_angle > 0:
#                         leftright_motion = 1
#                     elif tg_angle < 0:
#                         leftright_motion = -1
                
#                 elif og_angle != None:
#                     if og_angle > 0:
#                         leftright_motion = 1
#                     elif og_angle < 0:
#                         leftright_motion = -1


#                 print('leftright:', leftright_motion, 'forwards:', forwards_motion)

#                 angle = (math.atan2(leftright_motion, forwards_motion)) * (180 / math.pi)

#                 speed = math.sqrt((forwards_motion ** 2) + (leftright_motion ** 2))

#                 direction = angle


#                 print(f"Line touch cooldown: {self.line_touch_duration - time_since_touch:.1f}s remaining")
                       


# #################


#             if self.subsystems["Drivetrain"].manual == False:    
#                 self.subsystems["Drivetrain"].quickdrive_with_compass_north(direction, speed, -rotation, heading)

#                 if kick: 
#                     self.components["Kicker"].kick()

#         except Exception as e:
#             print("ERROR in frame processing")
#             print(e)
