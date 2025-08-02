import struct, zlib

def write_png(filename, width, height, pixels):
    # pixels: list of rows, each row is list of (r,g,b,a)
    raw_data = bytearray()
    for row in pixels:
        raw_data.append(0)  # filter type 0
        for r, g, b, a in row:
            raw_data.extend([r, g, b, a])
    compressed = zlib.compress(bytes(raw_data))
    with open(filename, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        def chunk(tag, data):
            f.write(struct.pack('!I', len(data)))
            f.write(tag)
            f.write(data)
            crc = zlib.crc32(tag)
            crc = zlib.crc32(data, crc)
            f.write(struct.pack('!I', crc & 0xffffffff))
        chunk(b'IHDR', struct.pack('!IIBBBBB', width, height, 8, 6, 0, 0, 0))
        chunk(b'IDAT', compressed)
        chunk(b'IEND', b'')

def generate_tiles():
    tile_size = 32
    tiles = [
        (128, 128, 128, 255),  # hidden
        (192, 192, 192, 255),  # revealed
        (255, 0, 0, 255)       # bomb
    ]
    width = tile_size * len(tiles)
    height = tile_size
    pixels = []
    for y in range(height):
        row = []
        for x in range(width):
            tile_index = x // tile_size
            row.append(tiles[tile_index])
        pixels.append(row)
    write_png('tiles.png', width, height, pixels)

if __name__ == '__main__':
    generate_tiles()
