"""Generate dependency-free PNG toolbar icons from the PrivacyVision shield mark."""
import math
import struct
import zlib
from pathlib import Path


def blend(base, color, opacity):
    return tuple(round(base[i] * (1 - opacity) + color[i] * opacity) for i in range(3)) + (255,)


def inside_polygon(x, y, points):
    sign = None
    for index, point in enumerate(points):
        next_point = points[(index + 1) % len(points)]
        cross = (next_point[0] - point[0]) * (y - point[1]) - (next_point[1] - point[1]) * (x - point[0])
        if sign is None:
            sign = cross >= 0
        elif (cross >= 0) != sign:
            return False
    return True


def distance_to_segment(x, y, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    length = dx * dx + dy * dy
    progress = 0 if not length else max(0, min(1, ((x - start[0]) * dx + (y - start[1]) * dy) / length))
    return math.hypot(x - (start[0] + progress * dx), y - (start[1] + progress * dy))


def render(size):
    scale = size / 128
    image = bytearray()
    shield = [(64 * scale, 15 * scale), (106 * scale, 30 * scale), (106 * scale, 60 * scale), (96 * scale, 89 * scale), (64 * scale, 112 * scale), (32 * scale, 89 * scale), (22 * scale, 60 * scale), (22 * scale, 30 * scale)]
    check_segments = [((42 * scale, 64 * scale), (55 * scale, 78 * scale)), ((55 * scale, 78 * scale), (86 * scale, 45 * scale))]
    for y in range(size):
        image.append(0)
        for x in range(size):
            # Deep navy rounded-square background.
            radius = 29 * scale
            dx = min(x, size - 1 - x)
            dy = min(y, size - 1 - y)
            if dx < radius and dy < radius and (radius - dx) ** 2 + (radius - dy) ** 2 > radius ** 2:
                color = (0, 0, 0, 0)
            else:
                glow = max(0, 1 - math.hypot(x - 92 * scale, y - 26 * scale) / (100 * scale))
                color = blend((7, 20, 38), (18, 74, 111), glow * .55)
            if color[3] and inside_polygon(x, y, shield):
                gradient = max(0, min(1, (x / size + 1 - y / size) / 2))
                color = blend((14, 116, 144), (29, 78, 216), gradient)
            if color[3] and min(distance_to_segment(x, y, start, end) for start, end in check_segments) <= 4.5 * scale:
                color = (242, 251, 255, 255)
            image.extend(color)
    raw = b"".join(bytes(image[row * (size * 4 + 1):(row + 1) * (size * 4 + 1)]) for row in range(size))
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
    return b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")


root = Path(__file__).resolve().parents[1] / "public" / "icons"
for size in (16, 48, 128):
    (root / f"icon{size}.png").write_bytes(render(size))
