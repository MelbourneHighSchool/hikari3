import asyncio
import time

from components.Oled import Oled
from overseers.North import North
from overseers.Direct import Direct
from overseers.Defender import Defender

print("-- PROGRAM START --")

#

from components.Button import Button
from initialise import components, subsystems, overseers, run_tasks

#

# Run first motor for a moment to indicate the robot is on
if "Motors" in components:
    motors = components["Motors"]

    motors[0].set_speed_rps(1)
    time.sleep(0.2)
    motors[0].set_speed_rps(0)
    time.sleep(0.2)
    motors[0].set_speed_rps(1)
    time.sleep(0.2)
    motors[0].set_speed_rps(0)

#

def stop_motors():
    try:
        if "Drivetrain" in subsystems: subsystems["Drivetrain"].spin(0)
        if "Dribbler" in components: components["Dribbler"].set_speed(0)
        if "Kicker" in components: components["Kicker"].device.off()
    except Exception as e:
        print(e)

#

print("Starting main program...")

oled_enabled = False

if oled_enabled:
    oled = Oled()


target = "Blue"
status = "Stopped"
kick = "Stopped"

pointers = ["mode", "target", "status", "kick"]
pointer_i = 0

pointer = pointers[pointer_i]

modes = [
    ("Direct", Direct),
    ("North", North),
    ("Defender", Defender),
    ]
mode_i = 0

mode = modes[mode_i]

mode_instance = None

note = "placeholder"

# Communication module control
comm_enabled = False
comm_connected = False

def check_comm_connection():
    """Check if communication module is available and connected"""
    global comm_enabled, comm_connected
    
    if "Comm" in components:
        comm_enabled = True
        try:
            # Test if we can read the GPIO state
            components["Comm"].get_state()
            comm_connected = True
            print("Communication module is available and connected")
        except Exception as e:
            comm_connected = False
            print(f"Communication module found but not connected: {e}")
    else:
        comm_enabled = False
        comm_connected = False
        print("Communication module not initialized")

def comm_start_robot():
    """Start the robot via communication module"""
    global status, note
    try:
        print("Communication module: Starting robot")
        status = "RUNNING"
        note = "Comm: Started"
        if "Drivetrain" in subsystems:
            subsystems["Drivetrain"].manual = False
        write_display()
    except Exception as e:
        print(f"Error starting robot via comm: {e}")
        note = f"Comm err: {e}"
        write_display()

def comm_stop_robot():
    """Stop the robot via communication module"""
    global status, note
    try:
        print("Communication module: Stopping robot")
        status = "Stopped"
        note = "Comm: Stopped"
        stop_motors()
        emergency_stop()
        # Explicitly ensure dribbler is stopped
        if "Dribbler" in components: 
            components["Dribbler"].set_speed(0)
        if "Drivetrain" in subsystems:
            subsystems["Drivetrain"].manual = True
        write_display()
    except Exception as e:
        print(f"Error stopping robot via comm: {e}")
        note = f"Comm err: {e}"
        write_display()

def setup_comm_callbacks():
    """Set up communication module callbacks"""
    global comm_enabled, comm_connected
    
    if comm_enabled and comm_connected:
        try:
            components["Comm"].set_start_callback(comm_start_robot)
            components["Comm"].set_stop_callback(comm_stop_robot)
            print("Communication module callbacks set up successfully")
        except Exception as e:
            print(f"Error setting up comm callbacks: {e}")

def write_display():
    global mode_name, target, status, pointer, note, comm_enabled, comm_connected
    
    if oled_enabled:
        oled.clear()
        oled.text(f"{'>' if pointer == 'mode' else ' '} MODE: {mode[0]}")
        oled.text(f"{'>' if pointer == 'target' else ' '} TARGET: {target}", y=12)
        oled.text(f"{'>' if pointer == 'status' else ' '} STATUS: {status}", y=24)
        oled.text(f"{'>' if pointer == 'kick' else ' '} KICK: {kick}", y=36)
        
        # Show communication status
        comm_status = "ON" if (comm_enabled and comm_connected) else "OFF"
        oled.text(f"COMM: {comm_status}", y=48)
        oled.text(f"*note: {note}", y=52)
        oled.show()

# Check and set up communication module
check_comm_connection()
setup_comm_callbacks()

write_display()

def initialise_mode():
    global mode, mode_i, modes, mode_instance, components, subsystems, note, target

    try:
        subsystems["ObjectDetection"].clear_frame_callbacks()

        if "Compass" in components: 
            print('zeroing compass')
            components["Compass"].zero()

        stop_motors()
        if "Drivetrain" in subsystems:
            subsystems["Drivetrain"].manual = True
        print(f'initialising mode {mode[0]}')
        note = f'init {mode[0]}'
        write_display()
        mode_instance = mode[1](components, subsystems) 

        if target == "Blue":
            mode_instance.targetGoal = "blueGoal"
            mode_instance.ownGoal = "yellowGoal"

        if target == "Yellow":
            mode_instance.targetGoal = "yellowGoal"
            mode_instance.ownGoal = "blueGoal"

    except Exception as e:
        print('error while initialising mode')
        print(e)
        note = f'err in init {mode[0]}'
        write_display()

initialise_mode()

# def destroy_current_mode():
#     pass

def emergency_stop():
    global status
    status = "Stopped"

    for _ in range(3):
        if "Drivetrain" in subsystems:
            subsystems["Drivetrain"].manual = True
        stop_motors()
        # Explicitly ensure dribbler is stopped
        if "Dribbler" in components: 
            components["Dribbler"].set_speed(0)

        time.sleep(0.01)


        
    write_display()

async def buttons():
    global mode_name, target, status, pointers, pointer_i, pointer
    global comm_enabled, comm_connected

    def short_press():
        print("Short press detected")
        global status
        if status == "RUNNING":
            status = "Stopped"
            stop_motors()
            emergency_stop()
            print("Robot stopped")
        else:
            status = "RUNNING"
            if "Drivetrain" in subsystems:
                subsystems["Drivetrain"].manual = False
            print("Robot started")
        write_display()

    def long_press():
        print("Long press detected")
        global target
        # switch between blue and yellow
        if target == "Blue":
            target = "Yellow"
            if mode_instance:
                mode_instance.targetGoal = "yellowGoal"
                mode_instance.ownGoal = "blueGoal"
        else:
            target = "Blue"
            if mode_instance:
                mode_instance.targetGoal = "blueGoal"
                mode_instance.ownGoal = "yellowGoal"
        print(f"Target switched to: {target}")
        write_display()

    button = Button(27, cooldown=0.3, long_press_duration=1.0)
    button.set_short_press_callback(short_press)
    button.set_long_press_callback(long_press)

    print('Button initialized on GPIO 27')
    
    try:
        while True:
            button.tick()
            
            # Monitor communication module if available
            if comm_enabled and comm_connected:
                try:
                    components["Comm"].tick()
                except Exception as e:
                    print(f"Error in comm module tick: {e}")
                    # Disable comm if it fails
                    comm_connected = False
                    note = "Comm disconnected"
                    write_display()
            
            await asyncio.sleep(0.01)  # Small delay to prevent busy waiting
    except Exception as e:
        print(f"Error in buttons task: {str(e)}")
        raise e
    finally:
        button.release()

# Run all tasks
try:
    # Create and gather all async tasks
    async def main():
        button_task = asyncio.create_task(buttons())
        other_tasks = asyncio.create_task(run_tasks())
        await asyncio.gather(button_task, other_tasks)
        
    asyncio.run(main())
except KeyboardInterrupt:
    print("\nShutting down gracefully...")
    if "Drivetrain" in subsystems: subsystems["Drivetrain"].spin(0)
    if "Dribbler" in components: components["Dribbler"].set_speed(0)
    if "Kicker" in components: components["Kicker"].device.off()