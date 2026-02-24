import pillow_heif
from PIL import Image

# 注册 HEIF 插件
pillow_heif.register_heif_opener()


def convert_heif_to_png_jpg(input_path, output_path, format="PNG"):
    """
    将 HEIF 转换为 PNG 或 JPG
    :param input_path: 输入 HEIF 文件路径
    :param output_path: 输出文件路径(扩展名决定格式)
    :param format: 'PNG' 或 'JPEG'
    """
    img = Image.open(input_path)
    img.save(output_path, format)


# 示例
convert_heif_to_png_jpg(
    "watchlist/static/images/nav.png",
    "watchlist/static/images/nav.webp",
    "WEBP",
)
