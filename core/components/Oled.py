from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import ssd1306
from PIL import ImageFont, Image, ImageDraw

class Oled:
    def __init__(self, i2c_port=1, i2c_address=0x3C, width=128, height=64):
        # Initialize the OLED display
        serial = i2c(port=i2c_port, address=i2c_address)
        self.device = ssd1306(serial, width=width, height=height)
        
        # Load the DejaVu font with size 10
        self.font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
        
        # Initialize the image and drawing context
        self.image = Image.new('1', (width, height))
        self.draw = ImageDraw.Draw(self.image)
        
        # Store the width and height for later use
        self.width = width
        self.height = height

    def clear(self):
        """Clear the OLED display."""
        self.draw.rectangle((0, 0, self.width, self.height), outline=0, fill=0)

    def text(self, text, x=0, y=0):
        """
        Display text on the OLED screen.
        
        :param text: The text to display
        :param x: X-coordinate for the text (default: 0)
        :param y: Y-coordinate for the text (default: 0)
        """
        self.draw.text((x, y), text, font=self.font, fill=255)

    def show(self):
        """Update the display with the current image content."""
        self.device.display(self.image)

    def __del__(self):
        """Ensure the device is properly cleaned up when the object is deleted."""
        # self.device.cleanup()
        pass

# Example usage:
if __name__ == "__main__":
    oled = Oled()
    oled.clear()
    oled.text("MODE: Attacker")
    oled.text("TARGET: Blue", y=20)
    oled.text("STATUS: Stopped", y=40)
    oled.show()

    import time
    time.sleep(5)

    oled.clear()
    oled.show()
