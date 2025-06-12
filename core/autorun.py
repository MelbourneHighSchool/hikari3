import asyncio
import time

from components.Oled import Oled
from overseers.Barebones import Barebones
from overseers.Defender import Defender
from overseers.Kick import Kick
from overseers.Kickfast import Kickfast
from overseers.Centre import Centre
from overseers.Flyby import Flyby
from overseers.Flybyfast import Flybyfast
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


oled = Oled()


target = "Yellow"
status = "Stopped"
kick = "Stopped"

pointers = ["mode", "target", "status", "kick"]
pointer_i = 0

pointer = pointers[pointer_i]

modes = [
    ("Flyby", Flyby),
    ("Flybyfast", Flybyfast),
    ("Centre", Centre),
    ("Defender", Defender),
    ("Barebones", Barebones), 
    ("Kick", Kick),
    ("Kickfast", Kickfast),
    ]
mode_i = 0

mode = modes[mode_i]

mode_instance = None

note = "placeholder"



def write_display():
    global mode_name, target, status, pointer, note
    
    oled.clear()
    oled.text(f"{'>' if pointer == 'mode' else ' '} MODE: {mode[0]}")
    oled.text(f"{'>' if pointer == 'target' else ' '} TARGET: {target}", y=12)
    oled.text(f"{'>' if pointer == 'status' else ' '} STATUS: {status}", y=24)
    oled.text(f"{'>' if pointer == 'kick' else ' '} KICK: {kick}", y=36)
    oled.text(f"*note: {note}", y=52)
    oled.show()

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
    status = "Stopped"
    if "Drivetrain" in subsystems:
        subsystems["Drivetrain"].manual = True
    stop_motors()
    write_display()

async def buttons():
    global mode_name, target, status, pointers, pointer_i, pointer

    def switch_pointer():
        try:
            global mode_name, target, status, kick, pointers, pointer_i, pointer

            if status == "RUNNING":
                pointer = "status"
                pointer_i = pointers.index("status")
                select_pointer()
                return

            pointer_i = (pointer_i + 1) % len(pointers)
            pointer = pointers[pointer_i]
            write_display()
        except Exception as e:
            print(e)

    def select_pointer():
        try:
            global mode_name, mode, mode_i, mode_instance, modes, target, status, kick, pointers, pointer_i, pointer

            if pointer == "mode":
                mode_i = (mode_i + 1) % len(modes)
                mode = modes[mode_i]

                print(f'switching mode to {mode}')
                initialise_mode()

        
            elif pointer == "target":
                # switch between blue and yellow

                if target == "Blue":
                    target = "Yellow"
                    mode_instance.targetGoal = "yellowGoal"
                    mode_instance.ownGoal = "blueGoal"
                else: # elif target == "Yellow":
                    target = "Blue"
                    mode_instance.targetGoal = "blueGoal"
                    mode_instance.ownGoal = "yellowGoal"

            elif pointer == "status":
                # turn on the mode (ie toggle paused / toggle manual)

                if status == "Stopped":
                    status = "RUNNING"
                    if "Drivetrain" in subsystems:
                        subsystems["Drivetrain"].manual = False
                    
                else:
                    print("STOPPING IT ALL")
                    stop_motors()
                    if "Drivetrain" in subsystems:
                        subsystems["Drivetrain"].manual = True
                    status = "Stopped"


            elif pointer == "kick":
                kick = "Kicking"
                write_display()

                if "Kicker" in components: components["Kicker"].kick()

                kick = "Stopped"
                
            write_display()
        except Exception as e:
            print(e)

    button_left = Button(23, cooldown=0.05, long_press_duration=1.4)
    button_left.set_short_press_callback(switch_pointer)
    button_left.set_long_press_callback(emergency_stop)

    button_right = Button(24, cooldown=0.05, long_press_duration=1.4)
    button_right.set_short_press_callback(select_pointer)
    button_right.set_long_press_callback(emergency_stop)

    left_line_sensor = LineSensor(27)
    right_line_sensor = LineSensor(22)

    print('button_left on success')
    print('button_right on success')
    
    try:
        while True:
            button_left.tick()
            button_right.tick()
            await asyncio.sleep(0.05)
    except Exception as e:
        print(f"Error in buttons task: {str(e)}")
        raise e

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