import numpy as np

def point_to_segment_distance(px, py, x1, y1, x2, y2):
    # Convert points to numpy arrays
    P = np.array([px, py], dtype=float)
    A = np.array([x1, y1], dtype=float)
    B = np.array([x2, y2], dtype=float)
    
    # Vector from A to B
    AB = np.subtract(B, A)
    # Vector from A to P
    AP = np.subtract(P, A)
    
    # Project AP onto AB (normalized)
    AB_squared = np.dot(AB, AB)
    if AB_squared == 0:
        # A and B are the same point
        return np.linalg.norm(P - A)
    
    t = np.dot(AP, AB) / AB_squared
    t = np.clip(t, 0, 1)  # Clamp t to the segment range [0, 1]
    
    # Find the closest point on the segment
    closest = np.add(A, np.multiply(t, AB))
    
    # Return the distance from P to the closest point
    return np.linalg.norm(P - closest)