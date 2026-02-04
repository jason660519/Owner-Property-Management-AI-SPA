import os
import random
from PIL import Image, ImageDraw, ImageFont

# Base directory
base_dir = "/Volumes/KLEVV-4T-1/Real Estate Management Projects/Owner-Property-Management-AI-SPA/resources/samples/房屋照片範例"

# Structure definition
properties = {
    "物件001_精選套房": {
        "室內": ["客廳.jpg", "臥室.jpg", "浴室.jpg"],
        "室外": ["外觀.jpg", "街道.jpg"]
    },
    "物件002_景觀豪宅": {
        "室內": ["豪華客廳.jpg", "主臥.jpg", "廚房.jpg", "書房.jpg"],
        "室外": ["花園.jpg", "泳池.jpg", "大門.jpg"]
    },
    "物件003_時尚辦公室": {
        "室內": ["辦公區.jpg", "會議室.jpg", "接待處.jpg"],
        "室外": ["大樓外觀.jpg", "停車場.jpg"]
    }
}

def create_dummy_image(path, text, color):
    img = Image.new('RGB', (800, 600), color=color)
    d = ImageDraw.Draw(img)
    # Try to load a font, otherwise use default (which might be small)
    try:
        # Try to find a font that supports CJK if possible, but default is usually ASCII only
        # We will use simple text or just draw rectangles if font is an issue
        font = ImageFont.load_default()
    except:
        font = None

    # Draw some random shapes to make it look less boring
    for _ in range(5):
        x1 = random.randint(0, 700)
        y1 = random.randint(0, 500)
        x2 = x1 + random.randint(50, 200)
        y2 = y1 + random.randint(50, 200)
        shape_color = (random.randint(0, 255), random.randint(0, 255), random.randint(0, 255))
        d.rectangle([x1, y1, x2, y2], fill=shape_color, outline="white")

    # Add text (filename without extension)
    text_content = os.path.splitext(text)[0]
    # Simple centered text (rough approximation)
    d.text((10, 10), text_content, fill=(255, 255, 255))
    
    img.save(path)
    print(f"Generated: {path}")

def main():
    if not os.path.exists(base_dir):
        print(f"Directory not found: {base_dir}")
        return

    for prop, areas in properties.items():
        prop_path = os.path.join(base_dir, prop)
        if not os.path.exists(prop_path):
            os.makedirs(prop_path)
            
        for area, files in areas.items():
            area_path = os.path.join(prop_path, area)
            if not os.path.exists(area_path):
                os.makedirs(area_path)
            
            for filename in files:
                file_path = os.path.join(area_path, filename)
                # Generate a random pastel color
                bg_color = (random.randint(100, 200), random.randint(100, 200), random.randint(100, 200))
                create_dummy_image(file_path, filename, bg_color)

if __name__ == "__main__":
    main()
