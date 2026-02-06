#!/usr/bin/env python3
"""
Generate AZ Barber App Icon - Concept A (Lettermark)
Output: 1024x1024 PNG for App Store + other required sizes
"""

from PIL import Image, ImageDraw, ImageFont
import os

# === Config ===
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS_DIR = os.path.join(BASE_DIR, "assets")
FONTS_DIR = os.path.join(BASE_DIR, "node_modules", "@expo-google-fonts")

# Colors
GOLD = (201, 169, 110)        # #C9A96E
GOLD_LIGHT = (212, 184, 122)  # #D4B87A
GOLD_DARK = (184, 148, 79)    # #B8944F
BG_COLOR = (17, 17, 17)       # #111111
BORDER_GOLD_30 = (201, 169, 110, 77)   # 30% opacity
BORDER_GOLD_15 = (201, 169, 110, 38)   # 15% opacity
GOLD_50 = (201, 169, 110, 128)         # 50% opacity
GOLD_80 = (201, 169, 110, 204)         # 80% opacity

# Font paths
PLAYFAIR_BOLD = os.path.join(FONTS_DIR, "playfair-display", "700Bold", "PlayfairDisplay_700Bold.ttf")
JETBRAINS_MEDIUM = os.path.join(FONTS_DIR, "jetbrains-mono", "500Medium", "JetBrainsMono_500Medium.ttf")

SIZE = 1024


def create_icon(size=1024):
    """Create the main app icon at the given size."""
    # Create RGBA image for transparency support during drawing
    img = Image.new("RGBA", (size, size), BG_COLOR + (255,))
    draw = ImageDraw.Draw(img)

    scale = size / 1024.0

    # --- Outer border frame (30% opacity gold) ---
    border_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    border_draw = ImageDraw.Draw(border_img)

    b1 = int(40 * scale)
    border_draw.rectangle(
        [b1, b1, size - b1 - 1, size - b1 - 1],
        outline=BORDER_GOLD_30,
        width=max(int(2 * scale), 1),
    )

    # Inner border (15% opacity)
    b2 = int(52 * scale)
    border_draw.rectangle(
        [b2, b2, size - b2 - 1, size - b2 - 1],
        outline=BORDER_GOLD_15,
        width=max(int(1 * scale), 1),
    )

    img = Image.alpha_composite(img, border_img)
    draw = ImageDraw.Draw(img)

    # --- "AZ" main text ---
    try:
        az_font_size = int(400 * scale)
        az_font = ImageFont.truetype(PLAYFAIR_BOLD, az_font_size)
    except Exception as e:
        print(f"Warning: Could not load Playfair Display font: {e}")
        az_font = ImageFont.load_default()

    az_text = "AZ"
    az_bbox = draw.textbbox((0, 0), az_text, font=az_font)
    az_w = az_bbox[2] - az_bbox[0]
    az_h = az_bbox[3] - az_bbox[1]

    # Center horizontally, positioned slightly above center
    az_x = (size - az_w) // 2
    az_y = int(size * 0.22) - az_bbox[1]  # Offset to visual center

    # Draw AZ with gold color
    draw.text((az_x, az_y), az_text, fill=GOLD, font=az_font)

    # --- Thin separator line ---
    line_y = int(630 * scale)
    line_x1 = int(280 * scale)
    line_x2 = int(744 * scale)

    line_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    line_draw = ImageDraw.Draw(line_img)
    line_draw.line(
        [(line_x1, line_y), (line_x2, line_y)],
        fill=GOLD_50,
        width=max(int(2 * scale), 1),
    )
    img = Image.alpha_composite(img, line_img)
    draw = ImageDraw.Draw(img)

    # --- "BARBER" subtitle ---
    try:
        barber_font_size = int(52 * scale)
        barber_font = ImageFont.truetype(JETBRAINS_MEDIUM, barber_font_size)
    except Exception as e:
        print(f"Warning: Could not load JetBrains Mono font: {e}")
        barber_font = ImageFont.load_default()

    barber_text = "B A R B E R"
    barber_bbox = draw.textbbox((0, 0), barber_text, font=barber_font)
    barber_w = barber_bbox[2] - barber_bbox[0]

    barber_x = (size - barber_w) // 2
    barber_y = int(670 * scale)

    # Draw with 80% opacity
    barber_img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    barber_draw = ImageDraw.Draw(barber_img)
    barber_draw.text((barber_x, barber_y), barber_text, fill=GOLD_80, font=barber_font)
    img = Image.alpha_composite(img, barber_img)

    return img


def save_icon(img, filename, target_size=None):
    """Save icon, optionally resizing. Convert to RGB (no transparency for App Store)."""
    if target_size and target_size != img.size[0]:
        resized = img.resize((target_size, target_size), Image.LANCZOS)
    else:
        resized = img

    # Convert to RGB (App Store requires no transparency)
    rgb_img = Image.new("RGB", resized.size, BG_COLOR)
    rgb_img.paste(resized, mask=resized.split()[3])

    path = os.path.join(ASSETS_DIR, filename)
    rgb_img.save(path, "PNG", quality=100)
    print(f"  Saved: {path} ({target_size or img.size[0]}x{target_size or img.size[0]})")
    return path


def create_splash_icon(size=200):
    """Create a smaller logo for splash screen (just AZ, no frame)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    try:
        az_font_size = int(140 * size / 200)
        az_font = ImageFont.truetype(PLAYFAIR_BOLD, az_font_size)
    except Exception:
        az_font = ImageFont.load_default()

    az_text = "AZ"
    az_bbox = draw.textbbox((0, 0), az_text, font=az_font)
    az_w = az_bbox[2] - az_bbox[0]
    az_x = (size - az_w) // 2
    az_y = int(size * 0.15) - az_bbox[1]

    draw.text((az_x, az_y), az_text, fill=GOLD, font=az_font)

    # Convert to RGB with dark background for splash
    rgb_img = Image.new("RGB", (size, size), BG_COLOR)
    rgb_img.paste(img, mask=img.split()[3])

    path = os.path.join(ASSETS_DIR, "splash-icon.png")
    rgb_img.save(path, "PNG")
    print(f"  Saved: {path} ({size}x{size})")
    return path


def main():
    print("Generating AZ Barber Logo - Concept A (Lettermark)")
    print("=" * 50)

    # Generate main icon at 1024x1024
    print("\n1. Creating 1024x1024 master icon...")
    master = create_icon(1024)
    save_icon(master, "icon.png", 1024)

    # Generate adaptive icon (Android) - same design
    print("\n2. Creating adaptive icon (Android)...")
    save_icon(master, "adaptive-icon.png", 1024)

    # Generate favicon
    print("\n3. Creating favicon...")
    save_icon(master, "favicon.png", 48)

    # Generate splash icon
    print("\n4. Creating splash icon...")
    create_splash_icon(200)

    print("\n" + "=" * 50)
    print("All icons generated successfully!")
    print(f"Output directory: {ASSETS_DIR}")


if __name__ == "__main__":
    main()
