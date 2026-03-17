from PIL import Image


def compress_avartar(image_path, output_path, size=(256, 256)):
    """
    压缩头像图片到指定大小并保持宽高比。
    :param image_path: 输入图片路径
    :param output_path: 输出图片路径
    :param size: 目标大小默认为(256, 256)
    """
    with Image.open(image_path) as img:
        # 保持宽高比，缩放图片
        img.thumbnail(size)

        # 保存压缩后的图片为WebP格式，质量设置为85
        img.save(output_path, format="webp", quality=85)


if __name__ == "__main__":
    # 示例用法
    compress_avartar("test.jpg", "thumbnail-256.webp")
