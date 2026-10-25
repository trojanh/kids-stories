import sys
import re
import os
import vtracer

def vectorize(in_path, out_path):
    print(f"Vectorizing {os.path.basename(in_path)} -> {os.path.basename(out_path)}...")
    vtracer.convert_image_to_svg_py(
        in_path,
        out_path,
        colormode='color',
        hierarchical='stacked',
        mode='spline',
        filter_speckle=10,
        color_precision=5,
        layer_difference=20,
        path_precision=1
    )
    with open(out_path, 'r', encoding='utf-8') as f:
        content = f.read()

    def fix_svg_tag(match):
        tag = match.group(0)
        w_match = re.search(r'width=\"(\d+)\"', tag)
        h_match = re.search(r'height=\"(\d+)\"', tag)
        if w_match and h_match:
            w, h = w_match.group(1), h_match.group(1)
            tag = re.sub(r'width=\"\d+\"', 'width=\"100%\"', tag)
            tag = re.sub(r'height=\"\d+\"', 'height=\"100%\"', tag)
            tag = tag[:-1] + f' viewBox=\"0 0 {w} {h}\" preserveAspectRatio=\"xMidYMid meet\">'
        return tag

    new_content = re.sub(r'<svg[^>]+>', fix_svg_tag, content, count=1)
    with open(out_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    size_kb = round(os.path.getsize(out_path) / 1024, 1)
    print(f"✓ Saved {out_path} ({size_kb} KB)")

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print("Usage: python vectorize_story_panel.py <input_img> <output_svg>")
        sys.exit(1)
    vectorize(sys.argv[1], sys.argv[2])
