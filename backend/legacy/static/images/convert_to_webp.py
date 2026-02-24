#!/usr/bin/env python3
"""Convert images to WebP format."""

from pathlib import Path

from PIL import Image

IMAGES_DIR = Path(
    "/Users/liudetao/Python-Projects/ReadingList/watchlist/static/images"
)

# Define conversions: (source, target, is_animated)
CONVERSIONS = [
    ("about.jpeg", "about.webp", False),
    ("avatar.png", "avatar.webp", False),
    ("cat.gif", "cat.webp", True),
    ("cat.png", "cat.webp", False),
    ("fish.PNG", "fish.webp", False),
    ("github.png", "github.webp", False),
    ("icon.png", "icon.webp", False),
    ("totoro.gif", "totoro.webp", True),
]


def convert_static_image(src_path: Path, dst_path: Path) -> None:
    """Convert a static image to WebP."""
    img = Image.open(src_path)
    if img.mode in ("RGBA", "LA", "P"):
        # Preserve alpha transparency
        img = img.convert("RGBA")
    img.save(dst_path, "WEBP", quality=80)
    print(f"  Converted: {src_path.name} -> {dst_path.name}")


def convert_animated_gif(src_path: Path, dst_path: Path) -> None:
    """Convert an animated GIF to animated WebP."""
    img = Image.open(src_path)
    frames = []
    durations = []

    try:
        while True:
            frame = img.copy()
            if frame.mode in ("RGBA", "LA", "P"):
                frame = frame.convert("RGBA")
            frames.append(frame)
            durations.append(img.info.get("duration", 100))
            img.seek(img.tell() + 1)
    except EOFError:
        pass

    if frames:
        frames[0].save(
            dst_path,
            "WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            quality=80,
        )
    print(
        f"  Converted (animated): {src_path.name} -> {dst_path.name} ({len(frames)} frames)"
    )


def main():
    print("Starting WebP conversion...")
    print("=" * 60)

    results = []

    for src_name, dst_name, is_animated in CONVERSIONS:
        src_path = IMAGES_DIR / src_name
        dst_path = IMAGES_DIR / dst_name

        print(f"\nProcessing: {src_name}")

        if not src_path.exists():
            print(f"  ERROR: Source file not found: {src_path}")
            results.append((src_name, "FAILED", "File not found"))
            continue

        try:
            if is_animated:
                convert_animated_gif(src_path, dst_path)
            else:
                convert_static_image(src_path, dst_path)

            # Verify the output
            if dst_path.exists():
                original_size = src_path.stat().st_size
                webp_size = dst_path.stat().st_size
                savings = (1 - webp_size / original_size) * 100
                print(
                    f"  Size: {original_size} bytes -> {webp_size} bytes ({savings:.1f}% smaller)"
                )
                results.append(
                    (src_name, "SUCCESS", f"{savings:.1f}% smaller")
                )
            else:
                results.append((src_name, "FAILED", "Output file not created"))
        except Exception as e:
            print(f"  ERROR: {e}")
            results.append((src_name, "FAILED", str(e)))

    print("\n" + "=" * 60)
    print("CONVERSION SUMMARY")
    print("=" * 60)
    for src_name, status, details in results:
        print(f"  {src_name}: {status} ({details})")

    success_count = sum(1 for _, status, _ in results if status == "SUCCESS")
    print(f"\nTotal: {success_count}/{len(results)} conversions successful")


if __name__ == "__main__":
    main()
