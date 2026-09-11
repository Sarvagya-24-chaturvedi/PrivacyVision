"""
Dataset Builder for MobileViT Browser Scene Classifier (SIH26171)
Generates synthetic webpage screenshot training data for 6 classes:
  login, payment, form, pii, dashboard, modal
"""
import os
import random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

CLASSES = ["login", "payment", "form", "pii", "dashboard", "modal"]
SAMPLES_PER_CLASS = 100
IMG_SIZE = (256, 256)
OUT_DIR = Path(__file__).parent / "data"

# ─────────────────────────────────────────────────────────
# COLOR PALETTES PER PAGE TYPE
# ─────────────────────────────────────────────────────────
COLORS = {
    "login":     {"bg": (15, 23, 42),  "card": (30, 41, 59),  "accent": (56, 189, 248), "text": (248, 250, 252)},
    "payment":   {"bg": (15, 23, 42),  "card": (30, 41, 59),  "accent": (16, 185, 129), "text": (248, 250, 252)},
    "form":      {"bg": (248, 250, 252),"card": (255, 255, 255),"accent": (59, 130, 246),"text": (15, 23, 42)},
    "pii":       {"bg": (15, 23, 42),  "card": (30, 41, 59),  "accent": (245, 158, 11), "text": (248, 250, 252)},
    "dashboard": {"bg": (17, 24, 39),  "card": (31, 41, 55),  "accent": (99, 102, 241), "text": (243, 244, 246)},
    "modal":     {"bg": (0, 0, 0),     "card": (30, 41, 59),  "accent": (239, 68, 68),  "text": (248, 250, 252)},
}

# ─────────────────────────────────────────────────────────
# PAGE CONTENT TEMPLATES
# ─────────────────────────────────────────────────────────
TEMPLATES = {
    "login": [
        ["Sign In", "Email", "________", "Password", "________", "[Log In]"],
        ["Login", "Username", "________", "Password", "________", "[Submit]"],
        ["Account Access", "Email Address", "________", "Secret Key", "________", "[Enter]"],
    ],
    "payment": [
        ["Checkout", "Card Number", "4111 **** **** 1111", "CVV", "***", "[Pay Now]"],
        ["Payment", "Credit Card", "________________", "Expiry", "MM/YY", "UPI ID", "[Complete]"],
        ["Billing", "Name on Card", "________", "Card No.", "____", "CVV", "[Confirm]"],
    ],
    "form": [
        ["Contact Us", "Name", "________", "Email", "________", "Message", "[Send]"],
        ["Registration", "Full Name", "________", "Date of Birth", "________", "[Register]"],
        ["Apply Now", "Name", "________", "Phone", "________", "Address", "[Submit]"],
    ],
    "pii": [
        ["KYC Verification", "Aadhaar", "2345 6789 0123", "PAN", "ABCDE1234F", "[Verify]"],
        ["Identity", "Aadhaar Number", "____________", "Phone (+91)", "__________", "[Confirm]"],
        ["Profile", "Full Name", "________", "Address", "_______________", "[Save]"],
    ],
    "dashboard": [
        ["Dashboard", "Users: 1,284", "Revenue: $48,290", "Active Sessions: 38", "[Analytics]"],
        ["Overview", "Total Items", "Pending", "Completed", "[View All]"],
        ["Admin Panel", "Reports", "Settings", "Users", "Logs", "[Export]"],
    ],
    "modal": [
        ["Confirm Action", "Are you sure you want to delete?", "[Cancel]", "[Delete]"],
        ["Session Expired", "Your session has ended.", "[Sign In Again]"],
        ["Error", "Invalid credentials. Please try again.", "[OK]"],
    ],
}


def draw_field(draw, x, y, w, h, color, label, value=""):
    """Draw a labeled input field."""
    draw.text((x, y - 12), label, fill=color["text"])
    draw.rectangle([x, y, x + w, y + h], outline=color["accent"], width=1)
    if value:
        draw.text((x + 4, y + 4), value[:24], fill=color["text"])


def draw_button(draw, x, y, w, h, label, color):
    """Draw a filled button."""
    draw.rounded_rectangle([x, y, x + w, y + h], radius=4, fill=color["accent"])
    draw.text((x + w // 2 - len(label) * 3, y + 6), label, fill=(0, 0, 0))


def render_page(class_name: str, variant: int, noise_seed: int) -> Image.Image:
    """Render a synthetic webpage screenshot."""
    color = COLORS[class_name]
    bg = color["bg"]
    img = Image.new("RGB", IMG_SIZE, color=bg)
    draw = ImageDraw.Draw(img)

    # Card background
    cx, cy = IMG_SIZE[0] // 2, IMG_SIZE[1] // 2
    cw, ch = 200, 180
    draw.rounded_rectangle(
        [cx - cw // 2, cy - ch // 2, cx + cw // 2, cy + ch // 2],
        radius=8, fill=color["card"]
    )

    # Get template
    templates = TEMPLATES[class_name]
    template = templates[variant % len(templates)]

    # Draw content
    py = cy - ch // 2 + 12
    for i, item in enumerate(template):
        if i == 0:
            draw.text((cx - len(item) * 3, py), item, fill=color["accent"])
            py += 22
        elif item.startswith("[") and item.endswith("]"):
            draw_button(draw, cx - 60, py, 120, 24, item[1:-1], color)
            py += 32
        elif item in ("________", "____________", "________________"):
            draw_field(draw, cx - 80, py, 160, 18, color, "", "")
            py += 28
        else:
            draw.text((cx - cw // 2 + 10, py), item[:28], fill=color["text"])
            py += 18

    # Random noise to avoid exact duplicates
    rng = np.random.RandomState(noise_seed)
    noise = rng.randint(0, 8, (*IMG_SIZE, 3), dtype=np.uint8)
    img_arr = np.array(img) + noise
    img_arr = np.clip(img_arr, 0, 255).astype(np.uint8)
    return Image.fromarray(img_arr)


def augment(img: Image.Image, seed: int) -> Image.Image:
    """Apply random augmentation."""
    rng = random.Random(seed)
    # Random rotation +-5 degrees
    angle = rng.uniform(-5, 5)
    img = img.rotate(angle, fillcolor=(20, 20, 20))
    # Random brightness
    from PIL import ImageEnhance
    brightness = rng.uniform(0.85, 1.15)
    img = ImageEnhance.Brightness(img).enhance(brightness)
    # Random contrast
    contrast = rng.uniform(0.9, 1.1)
    img = ImageEnhance.Contrast(img).enhance(contrast)
    # Random crop and resize back
    w, h = img.size
    cx = rng.randint(0, int(w * 0.05))
    cy = rng.randint(0, int(h * 0.05))
    img = img.crop((cx, cy, w - cx, h - cy)).resize((w, h), Image.LANCZOS)
    return img


def build_dataset():
    print(f"Building dataset in {OUT_DIR}")
    total = 0
    for cls in CLASSES:
        cls_dir = OUT_DIR / cls
        cls_dir.mkdir(parents=True, exist_ok=True)
        count = 0
        for s in range(SAMPLES_PER_CLASS):
            seed = s * 31 + CLASSES.index(cls) * 1000
            base_img = render_page(cls, variant=s % 3, noise_seed=seed)
            # Save base
            base_img.save(cls_dir / f"{cls}_{s:04d}_base.png")
            count += 1
            # Save augmented version
            aug_img = augment(base_img, seed=seed + 1)
            aug_img.save(cls_dir / f"{cls}_{s:04d}_aug.png")
            count += 1
        print(f"  [{cls}]: {count} images")
        total += count
    print(f"\nTotal dataset: {total} images across {len(CLASSES)} classes")
    print(f"Dataset saved to: {OUT_DIR}")


if __name__ == "__main__":
    build_dataset()
