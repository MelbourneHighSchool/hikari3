# SPDX-FileCopyrightText: 2023 Liz Clark for Adafruit Industries
# SPDX-License-Identifier: MIT

# Simple demo to read analog input on channel 0

import time
import board
import adafruit_ads7830.ads7830 as ADC
from adafruit_ads7830.analog_in import AnalogIn

i2c = board.I2C()

# Initialize ADS7830
adc1 = ADC.ADS7830(i2c, address=0x49)
adc2 = ADC.ADS7830(i2c, address=0x48)
adc3 = ADC.ADS7830(i2c, address=0x4B)

channels = [
    *[AnalogIn(adc1, i) for i in range(8)],
    *[AnalogIn(adc2, i) for i in range(8)],
    *[AnalogIn(adc3, i) for i in range(8)],
]

while True:
    # start = time.time()
    
    high_angles = []

    i = 0
    for chan in channels:
        angle = i * (360 / len(channels))
        value = round(chan.value / 65536.0, 1)
        
        if value > 0.4:
            # print(f"Sensor {i} at angle {angle}°: {value} (High)")
            high_angles.append(angle)

        i += 1
    
    if len(high_angles) > 0:
        average_angle = ((sum(high_angles) / len(high_angles)) + 30) % 360
        print(f"Line detected at angle {average_angle:.2f}°")

    else: 
        print("No line detected")

    # end = time.time()
    # print(f"Time taken: {(end - start) * 1000:.2f} ms")

    # Values over 0.8 are considered high
    # The angle of each sensor is offset by 360/len(chan) degrees
