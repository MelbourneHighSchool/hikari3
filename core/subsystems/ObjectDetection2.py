import multiprocessing
import multiprocessing.shared_memory
import multiprocessing.synchronize
import picamera2
import cv2
import numpy as np
import time

OBJ_BALL = 0
OBJ_BLUEGOAL = 1
OBJ_YELLOWGOAL = 2

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

        self.readout_ball_angle = multiprocessing.Value("f", 0.0)
        self.readout_ball_realdist = multiprocessing.Value("H", 0)

        self.frame_rgb = np.ndarray(buffer=self.rgb_frames_shm.buf, shape=[*self.camera.resolution, 3], dtype=np.uint8)
        self.frame_hsv = np.ndarray(buffer=self.hsv_frames_shm.buf, shape=[*self.camera.resolution, 3], dtype=np.uint8)

        # Events for terminating child processes
        worker_terminate_event = multiprocessing.Event()
    
    def start(self, frame_hsv: cv2.Mat):
        self.pool = multiprocessing.Pool(processes=1)
        tasks = [
            self.pool.apply_async(self.ball_proc, args=(frame_hsv, (self.hsv_time, self.ball_time))),
        ]
        self.pool.close()
        self.pool.join()
    
    @staticmethod
    def ball_proc(shared_arrs: tuple[3], shared_vars: tuple[4], terminate_event: multiprocessing.synchronize.Event):
        # Shared vars
        hsv_time = shared_vars[0]
        ball_time = shared_vars[1]
        readout_ball_angle = shared_vars[2]
        readout_ball_realdist = shared_vars[3]

        # Shared arrs [Note: must restart process to change]
        center = shared_arrs[0]
        resolution = shared_arrs[1]
        obj_settings = shared_arrs[2][7 * OBJ_BALL:7 * OBJ_BALL + 7]
        hsv_frames_shm = multiprocessing.shared_memory.SharedMemory(create=False, name="hsv_stream")
        frame_hsv = np.ndarray(buffer=hsv_frames_shm.buf, shape=[*resolution, 3], dtype=np.uint8)

        # Control variables?
        last_hsv_time = float("-inf")

        while True:  # [!] Must provide exit path
            # Check if program needs to terminate
            if terminate_event.is_set():
                return
            
            # Wait for new frame
            while hsv_time.value <= last_hsv_time:
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
                # If no contours angle and distance = 0
                readout_ball_realdist.value = 0
                readout_ball_angle.value = 0
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
            readout_ball_realdist.value, readout_ball_angle.value = ObjectDetection.rect_to_polar((x, y))
            ball_time.value = time.monotonic()

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