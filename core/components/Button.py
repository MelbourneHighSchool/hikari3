import gpiod
import time


chip = gpiod.Chip('gpiochip4')


class Button():
    def __init__(self, pin, cooldown=1.0, long_press_duration=1.0):
        self.pin = pin
        self.line = chip.get_line(pin)
        self.last_state = False
        self.short_press_callback = None
        self.long_press_callback = None
        self.cooldown = cooldown
        self.last_trigger_time = 0
        self.press_start_time = None
        self.long_press_duration = long_press_duration
        self.long_press_triggered = False

    def set_short_press_callback(self, callback):
        self.short_press_callback = callback

    def set_long_press_callback(self, callback):
        self.long_press_callback = callback

    def tick(self):
        current_time = time.time()

    def release(self):
        self.line.release()


class LineSensor():
    def __init__(self, pin):
        self.pin = pin
        self.line = chip.get_line(pin)

    def triggered(self):
        return self.line.get_value() == 0

    def release(self):
        self.line.release()



### EXAMPLE CODE ###
if __name__ == '__main__':
    def short_press():
        print("Short press detected - Toggle manual drive")

    def long_press():
        print("Long press detected - Toggle goal and spin dribbler")

    button = Button(23, cooldown=0.3, long_press_duration=2.0)
    button.set_short_press_callback(short_press)
    button.set_long_press_callback(long_press)

    # left_line_sensor = LineSensor(27)
    # right_line_sensor = LineSensor(22)

    print('button on')
    
    try:
        while True:
            # print(f"Left: {left_line_sensor.triggered()}, Right: {right_line_sensor.triggered()}")
            button.tick()
            time.sleep(0.01)
    finally:
        button.release()
        left_line_sensor.release()
        right_line_sensor.release()
