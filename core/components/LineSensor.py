import gpiod
import time


chip = gpiod.Chip('gpiochip4')


class LineSensor():
    def __init__(self, pin):
        self.pin = pin
        self.line = chip.get_line(pin)

    def triggered(self):
        return self.line.get_value() == 0

    def release(self):
        self.line.release()




if __name__ == '__main__':
    line_sensor = LineSensor(27)
    try:
        while True:
            print(line_sensor.triggered())
            time.sleep(0.1)
    finally:
        line_sensor.release()
