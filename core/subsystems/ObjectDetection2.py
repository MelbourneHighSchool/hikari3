import multiprocessing
import multiprocessing.shared_memory
import multiprocessing.synchronize
import struct
import cv2
import numpy as np
import time

OBJ_BALL = 0
OBJ_BLUEGOAL = 1
OBJ_YELLOWGOAL = 2

READOUT_FMT_BALL = "fHHB"
# float: Ball angle (rad)
# ushort: Ball distance (mm, 0 if not found)
# ushort: Ball img x (px)
# ushort: Ball img y (px)
# ubyte: Ball img radius (px)

READOUT_FMT_GOAL = "HHHHHHHH" + "HHHHHHHH" + "HHHHHHHH" + "ffff" + "?"
# ushort (8): Bounding box of chunk 1 (px)
# ushort (8): Bounding box of chunk 2 (px)
# ushort (8): Bounding box of combined goal (px)
# float (2): Start and end angle of chunk 1 (rad)
# float (2): Start and end angle of chunk 2 (rad)
# bool: How many goal chunks detected (0-2)

FMT_BALL_SIZE = struct.calcsize(READOUT_FMT_BALL)
FMT_GOAL_SIZE = struct.calcsize(READOUT_FMT_GOAL)

class ObjectDetection:
    def __init__(self, components, subsystems, is_main = True):
        self.is_main = is_main
        if 'Camera' not in components:
            raise AttributeError("components must have property 'Camera'")
        if 'AppdataManager' not in subsystems:
            raise AttributeError("subsystems must have property 'AppdataManager'")
        
        self.camera = components['Camera']
        self.appdata_manager = subsystems['AppdataManager']
        self.camera.set_callback(self.process_frame)

        # Defined by appdata_manager and subject to change
        self.OBJ_SETTINGS = multiprocessing.Array("i", [
            20,            # min contour size  # OBJ_BALL
            5, 150, 150,   # hsv lbound
            15, 255, 255,  # hsv ubound
            100,                               # OBJ_BLUEGOAL
            100, 150, 0,
            140, 255, 255,
            100,                               # OBJ_YELLOWGOAL
            20, 100, 100,
            30, 255, 255
        ])

        self.rgb_frames_shm = multiprocessing.shared_memory.SharedMemory(create=True, size=self.camera.resolution, name="rgb_stream")
        self.hsv_frames_shm = multiprocessing.shared_memory.SharedMemory(create=True, size=self.camera.resolution, name="hsv_stream")

        self.rgb_time = multiprocessing.Value("d", float("-inf"))
        self.hsv_time = multiprocessing.Value("d", float("-inf"))
        self.ball_time = multiprocessing.Value("d", float("-inf"))
        self.blue_goal_time = multiprocessing.Value("d", float("-inf"))
        self.yellow_goal_time = multiprocessing.Value("d", float("-inf"))

        # Defined in appdata_manager... I think
        self.center = multiprocessing.Array("i", [500, 400])
        self.resolution = multiprocessing.Array("i", [1000, 800])

        # Readout data
        self.readout_ball = multiprocessing.shared_memory.SharedMemory(create=True, size=FMT_BALL_SIZE, name="readout_ball")
        self.readout_bluegoal = multiprocessing.shared_memory.SharedMemory(create=True, size=FMT_GOAL_SIZE, name="readout_bluegoal")
        self.readout_yellowgoal = multiprocessing.shared_memory.SharedMemory(create=True, size=FMT_GOAL_SIZE, name="readout_yellowgoal")

        self.frame_rgb = np.ndarray(buffer=self.rgb_frames_shm.buf, shape=[*self.camera.resolution, 3], dtype=np.uint8)
        self.frame_hsv = np.ndarray(buffer=self.hsv_frames_shm.buf, shape=[*self.camera.resolution, 3], dtype=np.uint8)

        # Events for terminating child processes
        self.worker_terminate_event = multiprocessing.Event()

    def start(self, frame_hsv: cv2.Mat):
        self.pool = multiprocessing.Pool(processes=1)
        self.pool.apply_async(self.ball_proc, args=(
            (self.center, self.resolution, self.OBJ_SETTINGS),  # Shared arrs
            (self.hsv_time, self.ball_time),                    # Shared vars
            self.worker_terminate_event                         # Terminate event
        ))
        self.pool.close()
        self.pool.join()
    
    @staticmethod
    def ball_proc(shared_arrs: tuple[3], shared_vars: tuple[2], terminate_event: multiprocessing.synchronize.Event):
        # Shared vars
        hsv_time = shared_vars[0]
        ball_time = shared_vars[1]

        # Shared arrs [Note: must restart process to change]
        center = shared_arrs[0]
        resolution = shared_arrs[1]
        readout_ball_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="readout_ball")
        obj_settings = shared_arrs[2][7 * OBJ_BALL:7 * OBJ_BALL + 7]
        hsv_frames_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="hsv_stream")
        frame_hsv = np.ndarray(buffer=hsv_frames_shm.buf, shape=[*resolution, 3], dtype=np.uint8)

        # Control variables?
        last_hsv_time = float("-inf")

        while not terminate_event.is_set():
            # Wait for new frame
            while hsv_time.value <= last_hsv_time and not terminate_event.is_set():
                time.sleep(0.01)
            
            last_hsv_time = hsv_time.value

            # Object settings [Note: subject to change]
            min_contour_size = obj_settings[0]
            lbound = obj_settings[1:4]
            ubound = obj_settings[4:7]

            # Create mask 
            mask = cv2.inRange(frame_hsv, lbound, ubound)
            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours = [c for c in contours if cv2.contourArea(c) >= min_contour_size]
            if not contours:
                # If no contours, distance = 0 indicates it's not found
                struct.pack_into(READOUT_FMT_BALL, readout_ball_shm.buf, 0,
                                 0, 0, 0, 0)
                ball_time.value = time.monotonic()
                continue
            
            # Find the *best* circle
            max_radius = 0
            circle_origin = (0, 0)
            for c in contours:
                (x, y), radius = cv2.minEnclosingCircle(c)
                if radius > max_radius:
                    max_radius = radius
                    circle_origin = (int(x), int(y))
            
            x -= center[1]
            y -= center[0]

            # Update information
            struct.pack_into(READOUT_FMT_BALL, readout_ball_shm.buf, 0,
                             )
            ball_time.value = time.monotonic()
    
    @staticmethod
    def goal_proc(obj: int, shared_arrs: tuple[3], shared_vars: tuple[4], terminate_event: multiprocessing.synchronize.Event):
        # Shared vars
        hsv_time = shared_vars[0]
        goal_time = shared_vars[1]

        # Shared arrs
        center = shared_arrs[0]
        resolution = shared_arrs[1]
        hsv_frames_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="hsv_stream")
        frame_hsv = np.ndarray(buffer=hsv_frames_shm.buf, shape=[*resolution, 3], dtype=np.uint8)

        if obj == OBJ_BLUEGOAL:
            readout_goal_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="readout_bluegoal")
            obj_settings = shared_arrs[2][7 * OBJ_BLUEGOAL:7 * OBJ_BLUEGOAL + 7]
        elif obj == OBJ_YELLOWGOAL:
            readout_goal_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="readout_yellowgoal")
            obj_settings = shared_arrs[2][7 * OBJ_YELLOWGOAL:7 * OBJ_YELLOWGOAL + 7]
        
        # Control variables?
        last_hsv_time = hsv_time.value()

        while not terminate_event.is_set():
            # Wait for new frame
            while hsv_time.value <= last_hsv_time and not terminate_event.is_set():
                time.sleep(0.01)

            last_hsv_time = hsv_time.value()

            # Object settings [Note: subject to change]
            min_contour_size = obj_settings[0]
            lbound = obj_settings[1:4]
            ubound = obj_settings[4:7]

            # Create mask
            mask = cv2.inRange(frame_hsv, lbound, ubound)

            # Find contours
            contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contours = [c for c in contours if cv2.contourArea(c) >= min_contour_size]
            if not contours:
                # If no contours, set # goals found -> 0
                readout_goal_shm.buf[-1] = 0
                goal_time.value = time.monotonic()
                continue

            ### Waiting on code to merge goals bc i cbb
            # Find the *best* *rotated* rectangle (copilot help me make this get the biggest rotated rect rather than normal rect) # Copilot?
            max_area = 0
            rect = (0, 0, 0, 0)
            for c in contours:
                # Get the rotated rectangle
                box = cv2.minAreaRect(c)
                area = box[1][0] * box[1][1]
                if area > max_area:
                    max_area = area
                    rect = box

            # Update information
            struct.pack_into(READOUT_FMT_GOAL, readout_goal_shm.buf, 0,
                             *ObjectDetection.rect_to_polar(rect), *rect)
            goal_time.value = time.monotonic()

    @staticmethod
    def imgdist_to_realdist(imgdist: float):
        return np.arctan(imgdist / 1000)
    
    @staticmethod
    def realdist_to_imgdist(realdist: float):
        return np.tan(realdist) * 1000
    
    @staticmethod
    def rect_to_polar(point: tuple):
        x, y = point
        r = np.sqrt(x*x + y*y)
        theta = np.arctan2(y, x)
        return (r, theta)
    
    @staticmethod
    def polar_to_rect(point: tuple):
        r, theta = point
        x = r * np.cos(theta)
        y = r * np.sin(theta)
        return (x, y)