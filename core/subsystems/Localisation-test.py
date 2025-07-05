import cv2
import numpy as np

def blue_goal_mask(frame: cv2.Mat):
    # Convert the frame to HSV color space
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    
    # Define the lower and upper bounds for blue color in HSV
    lower_blue = (100, 150, 0)
    upper_blue = (140, 255, 255)
    
    # Create a mask for blue color
    mask = cv2.inRange(hsv, lower_blue, upper_blue)
    
    return mask    

def yellow_goal_mask(frame: cv2.Mat):
    # Convert the frame to HSV color space
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)

    # Define the lower and upper bounds for yellow color in HSV
    lower_yellow = (20, 100, 100)
    upper_yellow = (30, 255, 255)

    # Create a mask for yellow color
    mask = cv2.inRange(hsv, lower_yellow, upper_yellow)

    return mask

def get_goal_bounding_box(mask: cv2.Mat):
    # Find contours in the mask
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    if contours:
        # Get the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        if largest_contour is None or cv2.contourArea(largest_contour) < 100:
            return None
        
        # Get the bounding rectangle of the largest contour
        x, y, w, h = cv2.boundingRect(largest_contour)
        
        return (x, y, w, h)
    
    return None

def get_box_center(bounding_box: tuple):
    if bounding_box:
        x, y, w, h = bounding_box
        center_x = x + w // 2
        center_y = y + h // 2
        return (center_x, center_y)
    return None

cap = cv2.VideoCapture(0)
ret, frame = cap.read()
dims = np.array(frame.shape[:2])[::-1]
center = dims // 2
print(f"Frame dimensions: {dims}")
while True:
    ret, frame = cap.read()
    blue_goal_bounding_box = get_goal_bounding_box(blue_goal_mask(frame))
    yellow_goal_bounding_box = get_goal_bounding_box(yellow_goal_mask(frame))
    blue_goal_center = get_box_center(blue_goal_bounding_box) if blue_goal_bounding_box else None
    yellow_goal_center = get_box_center(yellow_goal_bounding_box) if yellow_goal_bounding_box else None

    if blue_goal_bounding_box:
        cv2.circle(frame, blue_goal_center, 5, (255, 0, 0), -1)  # Blue goal center
        cv2.rectangle(frame, (blue_goal_bounding_box[0], blue_goal_bounding_box[1]),
                  (blue_goal_bounding_box[0] + blue_goal_bounding_box[2], blue_goal_bounding_box[1] + blue_goal_bounding_box[3]),
                  (255, 0, 0), 2)
    if yellow_goal_bounding_box:
        cv2.circle(frame, yellow_goal_center, 5, (0, 255, 255), -1)  # Yellow goal center
        cv2.rectangle(frame, (yellow_goal_bounding_box[0], yellow_goal_bounding_box[1]),
                  (yellow_goal_bounding_box[0] + yellow_goal_bounding_box[2], yellow_goal_bounding_box[1] + yellow_goal_bounding_box[3]),
                  (0, 180, 220), 2)
    
    blue_goal_vector = blue_goal_center - center if blue_goal_center else None
    yellow_goal_vector = yellow_goal_center - center if yellow_goal_center else None
    if blue_goal_vector is not None and yellow_goal_vector is not None:
        # Draw vectors to goals
        cv2.arrowedLine(frame, center, blue_goal_center, (255, 0, 0), 2)
        cv2.arrowedLine(frame, center, yellow_goal_center, (0, 255, 255), 2)

        # Draw vectors from each goal to their sum
        goal_sum_vector = blue_goal_vector + yellow_goal_vector
        cv2.arrowedLine(frame, blue_goal_center, goal_sum_vector + center, (255, 0, 0), 2)
        cv2.arrowedLine(frame, yellow_goal_center, goal_sum_vector + center, (0, 255, 255), 2)

        # Draw vector from camera center to center of field, which is half of the goal sum
        field_center = center + goal_sum_vector // 2
        cv2.arrowedLine(frame, center, field_center, (0, 255, 0), 2)
    
    cv2.imshow('Frame', frame)
    if cv2.waitKey(1) & 0xFF == ord('b'):
        break