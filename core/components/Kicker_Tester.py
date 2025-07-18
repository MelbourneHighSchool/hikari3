# The Kicker class briefly turns on a relay to power the kicker solenoid
# Uses gpiozero to control a digital output pin for kicker activation

import atexit
from gpiozero import DigitalOutputDevice
import time

def on_exit():
    # --- BEGIN USER EXIT LOGIC ---
    print("Exiting! Place your cleanup logic here.")
    print("stopping kicking cuz starr meanly quit me :(")
    # --- END USER EXIT LOGIC ---

atexit.register(on_exit)

class Kicker:
    def __init__(self, pin):
        self.pin = pin
        self.device = DigitalOutputDevice(pin)
        self.no_kick_until = 0

    def kick(self, cooldown=300):
        now = time.time() * 1000

        if now < self.no_kick_until:
            return print('kick on cooldown')

        if cooldown > 0:
            self.no_kick_until = now + cooldown       


        self.device.on()
        time.sleep(15 / 1/000)
        self.device.off()

if __name__ == "__main__":
    kicker = Kicker(17)
    print("Kicking")
    while 1:
        kicker.kick()

