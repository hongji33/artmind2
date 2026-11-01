"""Small valid image for offline browser tests; never substitutes production images."""
from io import BytesIO
from PIL import Image
_buffer=BytesIO();Image.new('RGB',(64,48),'#63836f').save(_buffer,format='PNG')
PNG=_buffer.getvalue()
