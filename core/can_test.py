from serial_can_fd import SerialCANFD
import time

# 1️⃣  Use GPIO UART: /dev/serial0
# http://dev/ttyS0
can = SerialCANFD('/dev/ttyAMA0', 9600)

# 2️⃣  Optional: set the CAN nominal speed to 500 kbps
can.can_speed_20(1000000)


# while True:
#     # # 3️⃣  Send a simple CAN frame
#     can.can_send(
#         can_id=0x200,    # CAN ID
#         ext=0,           # standard frame
#         rtr=0,           # data frame, not remote request
#         fdf=0,           # classic CAN, not CAN FD
#         data=bytearray([0x40, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
#     )

#     print("Sent CAN frame!")

#     time.sleep(0.01)


# 4️⃣  Read incoming CAN frames in a loop
try:
    print("Reading CAN frames")
    # pass
    
    while True:
        frame = can.read_can()
        if frame:
            can_id, ext, rtr, fdf, data = frame
            print(f"Received CAN ID: 0x{can_id:X}")
            print(f"  EXT: {ext}, RTR: {rtr}, FDF: {fdf}")
            # print(f"  Data: {[hex(b) for b in data]}")

            # Decode the received data according to the provided table
            rotor_angle = (data[0] << 8) | data[1]  # 0~8191 (0~360°)

            # Interpret speed as signed 16-bit integer
            speed = (data[2] << 8) | data[3]
            if speed >= 0x8000:
                speed -= 0x10000

            # Interpret torque_current as signed 16-bit integer
            torque_current = (data[4] << 8) | data[5]
            if torque_current >= 0x8000:
                torque_current -= 0x10000

            temperature = data[6]  # °C         # °C

            print(f"Received CAN ID: 0x{can_id:X}")
            print(f"  EXT: {ext}, RTR: {rtr}, FDF: {fdf}")
            print(f"  Rotor Angle: {rotor_angle} (0~8191, 0~360°)")
            print(f"  Speed: {speed} rpm")
            print(f"  Torque Current: {torque_current}")
            print(f"  Temperature: {temperature} °C")
            print(f"  Raw Data: {[hex(b) for b in data]}")
        time.sleep(0.01)

except KeyboardInterrupt:
    print("\nClosing CAN interface.")
    can.close()
