from typing import Dict, Any
import json
import time
import asyncio  # Make sure to import asyncio at the top

class RemoteControl:
    def __init__(self, components: Dict[str, Any], subsystems: Dict[str, Any]):
        """Initialize the remote control subsystem.
        
        Args:
            components: Dictionary of robot components
            subsystems: Dictionary of robot subsystems
        """
        self.websocket = components["WebsocketServer"]
        self.drivetrain = subsystems["Drivetrain"]
        self.kicker = components["Kicker"]
        
        if "Compass" in components:
            self.compass = components["Compass"]
        else:
            self.compass = None
        
        if "Dribbler" in components:
            self.dribbler = components["Dribbler"]
        else:
            self.dribbler = None
        self.last_kick_time = 0
        self.kick_cooldown = 1.0  # 1 second cooldown
        self.dribbler_active = False  # Track dribbler state
        self.setup_handlers()

    def setup_handlers(self):
        """Set up WebSocket message handlers"""
        self.websocket.add_message_handler("drive", self.handle_drive)
        self.websocket.add_message_handler("stop", self.handle_stop)
        self.websocket.add_message_handler("kick", self.handle_kick)
        self.websocket.add_message_handler("dribbler", self.handle_dribbler)

    async def handle_drive(self, message: Dict[str, Any]) -> Dict[str, Any]:
        print('remotecontrol', message)
        """Handle drive commands from WebSocket.
        
        Expected message format:
        {
            "type": "drive",
            "angle": float,  # Angle in degrees (0-360)
            "speed": float   # Speed percentage (0-100)
            "rotation": float
        }
        """
        try:
            print(message.get("angle", 0))
            if message.get("angle", 0) == "manual":
                command = message.get("speed", 0)
                if command == "enable":
                    self.drivetrain.manual = True
                    print("ENABLED MANUAL DRIVE")

                    self.drivetrain.spin(0)
                elif command == "disable":
                    self.drivetrain.manual = False
                    print("DISABLED MANUAL DRIVE")

                    if self.compass:
                        self.compass.zero()
                
                return

            angle = float(message.get("angle", 0))
            speed = float(message.get("speed", 0))
            rotation = float(message.get("rotation", 0))
            
            
            # Validate inputs
            speed = max(0, min(100, speed))  # Clamp speed to 0-100
            angle = angle % 360  # Normalize angle to 0-360
            
            # Send command to drivetrain
            self.drivetrain.handle_remote_control(angle, speed, rotation)

            print("rot", rotation)
            
            return {
                "type": "drive_response",
                "status": "success",
                "angle": angle,
                "speed": speed
            }
            
        except (ValueError, TypeError) as e:
            return {
                "type": "drive_response",
                "status": "error",
                "message": f"Invalid drive parameters: {str(e)}"
            }

    async def handle_stop(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle emergency stop commands from WebSocket.
        
        Expected message format:
        {
            "type": "stop"
        }
        """
        try:
            self.drivetrain.quickdrive(0, 0)
            return {
                "type": "stop_response",
                "status": "success"
            }
        except Exception as e:
            return {
                "type": "stop_response",
                "status": "error",
                "message": str(e)
            }

    async def handle_kick(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle kick commands from WebSocket."""
        current_time = time.time()
        time_since_last_kick = current_time - self.last_kick_time

        if time_since_last_kick < self.kick_cooldown:
            print("kick on cooldown")
            return {
                "type": "kick_response",
                "status": "error",
                "message": f"Kick on cooldown ({self.kick_cooldown - time_since_last_kick:.1f}s remaining)"
            }

        try:
            print("KICKING")
            self.kicker.kick()
            self.last_kick_time = current_time
            return {
                "type": "kick_response",
                "status": "success"
            }
        except Exception as e:
            return {
                "type": "kick_response",
                "status": "error",
                "message": str(e)
            }

    async def handle_dribbler(self, message: Dict[str, Any]) -> Dict[str, Any]:
        """Handle dribbler toggle commands from WebSocket."""
        try:
            if self.dribbler == None: return

            self.dribbler_active = not self.dribbler_active
            if self.dribbler_active:
                self.dribbler.set_speed(0.0002)  # Full speed when on
            else:
                # Spin at 1 RPM for 1 second before stopping
                self.dribbler.set_speed(0.05)  # Set to 1 RPM
                await asyncio.sleep(1)  # Wait for 1 second
                self.dribbler.set_speed(0)  # Stop the dribbler

            return {
                "type": "dribbler_response",
                "status": "success",
                "active": self.dribbler_active
            }
        except Exception as e:
            return {
                "type": "dribbler_response",
                "status": "error",
                "message": str(e)
            }

    async def broadcast_status(self):
        """Broadcast current drivetrain status to all clients"""
        status = {
            "type": "status",
            "motors": []
        }
        
        # Collect status from each motor
        for i, motor in enumerate(self.drivetrain.motors):
            status["motors"].append({
                "index": i,
                "angle_offset": motor.angle_offset,
                "speed_rps": motor.get_speed_rps()
            })
            
        await self.websocket.broadcast(status)
