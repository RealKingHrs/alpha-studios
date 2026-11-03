"""Builds a glossy vinyl-toy character from an avatar spec and renders it with a transparent background.

Run headless:  blender -b -P blender/character.py -- job.json out.png a|b
job.json is written by scripts/render-3d.ts from a member's saved avatar record (kit version 1).
Expression a is the calm smile; expression b is the grin with raised brows and squinting eyes.
"""
import bpy, bmesh, json, math, sys
from mathutils import Vector

argv = sys.argv[sys.argv.index('--') + 1:]
job = json.load(open(argv[0]))
out, expr = argv[1], argv[2]
S = 6.0  # kit units to scene units


def hexrgb(h):
    h = h.lstrip('#')
    lin = lambda c: ((c / 255 + 0.055) / 1.055) ** 2.4 if c / 255 > 0.04045 else c / 255 / 12.92
    return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), 1)


def mat(name, color, rough=0.28, clear=0.6, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = hexrgb(color) if isinstance(color, str) else color
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for key in ('Coat Weight', 'Clearcoat'):
        if key in b.inputs:
            b.inputs[key].default_value = clear
    return m


def shade(obj, m):
    obj.data.materials.append(m)
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def sphere(loc, scale, m, seg=48):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=seg // 2, location=loc)
    o = bpy.context.object
    o.scale = scale
    return shade(o, m)


def cyl(loc, r, depth, m, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=depth, location=loc, rotation=rot)
    return shade(bpy.context.object, m)


def torus(loc, major, minor, m, rot=(0, 0, 0), scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, location=loc, rotation=rot,
                                     major_segments=64, minor_segments=16)
    o = bpy.context.object
    o.scale = scale
    return shade(o, m)


def tube(points, radius, m):
    c = bpy.data.curves.new('c', 'CURVE')
    c.dimensions = '3D'
    c.bevel_depth = radius
    c.bevel_resolution = 6
    c.use_fill_caps = True
    s = c.splines.new('BEZIER')
    s.bezier_points.add(len(points) - 1)
    for bp, p in zip(s.bezier_points, points):
        bp.co = p
        bp.handle_left_type = bp.handle_right_type = 'AUTO'
    o = bpy.data.objects.new('t', c)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(m)
    return o


# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.film_transparent = True
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGBA'
try:
    scene.eevee.taa_render_samples = 48
except Exception:
    pass
scene.view_settings.view_transform = 'Standard'

head = job['head']
hw, hh, hd = head['w'] * S * 1.7, head['h'] * S * 1.7, head['d'] * S * 1.7
skin = mat('skin', job['skin'], rough=0.34, clear=0.5)
dark = mat('dark', '#14110f', rough=0.2, clear=0.8)
white = mat('white', '#fbfaf6', rough=0.15, clear=0.9)
hair_m = mat('hair', job['hair']['color'], rough=0.4, clear=0.4)
outfit_m = mat('outfit', job['outfit']['color'], rough=0.55, clear=0.1)

# torso and neck
sphere((0, 0.1, -hh * 1.55), (hw * 1.3, hd * 0.85, hh * 0.52), outfit_m)
cyl((0, 0, -hh * 0.95), hw * 0.3, hh * 0.5, skin)
style = job['outfit']['style']
if style == 'hoodie':
    torus((0, 0.05, -hh * 1.12), hw * 0.55, hw * 0.16, outfit_m, scale=(1, 1, 0.7))
    sphere((0, -hd * 0.6, -hh * 1.78), (hw * 0.5, hd * 0.12, hh * 0.18), mat('pocket', job['outfit']['color'], 0.6, 0.0))
elif style == 'collar':
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=hw * 0.28, depth=hh * 0.5,
                                        location=(sx * hw * 0.22, -hd * 0.55, -hh * 1.15),
                                        rotation=(math.radians(10), sx * math.radians(30), sx * math.radians(18)))
        shade(bpy.context.object, white)
else:
    torus((0, 0, -hh * 1.12), hw * 0.34, hw * 0.07, outfit_m, scale=(1, 0.9, 0.8))

# head
sphere((0, 0, 0), (hw, hd, hh), skin, seg=64)
# ears
for sx in (-1, 1):
    sphere((sx * hw * 0.98, 0, -hh * 0.05), (hw * 0.1, hd * 0.07, hh * 0.18), skin)

def face_y(x, z):
    """Where the front of the head is at a given sideways and height position."""
    return -hd * math.sqrt(max(0.02, 1 - (x / hw) ** 2 - (z / hh) ** 2))


# nose
n = job['nose']
sphere((0, face_y(0, -hh * 0.05) + 0.02, -hh * 0.05), (n['r'] * S * 0.9, n['r'] * S * 0.7, n['r'] * S * 0.8), skin)

# eyes
e = job['eyes']
ez = hh * (0.12 + e['y'] * 2)
gap = e['gap'] * S * 1.2
for sx in (-1, 1):
    r = e['r'] * S * 1.5
    ey = face_y(sx * gap, ez) * 0.97
    if expr == 'b':  # squinting grin: flattened eyes
        sphere((sx * gap, ey, ez), (r * 1.1, r * 0.5, r * 0.45), dark)
    else:
        sphere((sx * gap, ey, ez), (r * 1.15, r * 0.6, r * 1.25), white)
        sphere((sx * gap, ey - r * 0.4, ez), (r * 0.62, r * 0.4, r * 0.8), dark)
        sphere((sx * gap + r * 0.18, ey - r * 0.7, ez + r * 0.3), (r * 0.16, r * 0.1, r * 0.16), white)

# brows
b = job['brows']
bey = face_y(0, ez + hh * 0.35) + 0.02
lift = hh * (0.09 if expr == 'b' else 0.0)
for sx in (-1, 1):
    bw = b['w'] * S * 1.3
    tilt = b['tilt'] * sx
    tube([(sx * gap - bw, bey, ez + hh * 0.32 + lift - tilt * bw * 0.4),
          (sx * gap, bey - 0.05, ez + hh * 0.38 + lift),
          (sx * gap + bw, bey, ez + hh * 0.32 + lift + tilt * bw * 0.4)], b['t'] * S * 0.55, hair_m)

# mouth
m = job['mouth']
mw = m['w'] * S * 1.5 * (1.35 if expr == 'b' else 1.0)
mz = -hh * 0.42
my = face_y(0, mz) + 0.06
kind = m['kind']
if expr == 'b' or kind == 'open':
    sphere((0, my, mz), (mw * 0.8, hd * 0.06, mw * 0.5), dark)
    sphere((0, my - 0.02, mz - mw * 0.2), (mw * 0.5, hd * 0.05, mw * 0.22), mat('tongue', '#e0675a', 0.4, 0.3))
else:
    curve = {'smile': 0.28, 'flat': 0.0, 'smirk': 0.2}.get(kind, 0.2) * mw
    skew = mw * 0.35 if kind == 'smirk' else 0
    tube([(-mw, my, mz + curve + skew), (0, my - 0.03, mz - curve * 0.6), (mw, my, mz + curve - skew)], 0.045, dark)

# hair
st = job['hair']['style']
top = (0, hd * 0.24, hh * 0.3)
if st in ('short', 'sidePart', 'curly', 'long', 'bun', 'spiky'):
    sphere(top, (hw * 1.06, hd * 1.02, hh * 0.92), hair_m, seg=64)
    # cut the face area back by letting the skin head poke through: cap sits behind and above the brow line
    for o in bpy.context.scene.objects:
        pass
if st == 'buzz':
    sphere((0, hd * 0.2, hh * 0.3), (hw * 1.02, hd * 1.0, hh * 0.88), mat('buzz', job['hair']['color'], 0.8, 0.0))
if st == 'curly':
    import random
    random.seed(7)
    for i in range(16):
        a = i / 16 * math.tau
        sphere((math.cos(a) * hw * 0.85, hd * 0.15 + math.sin(a) * hd * 0.7, hh * (0.55 + random.random() * 0.4)),
               (hw * 0.28,) * 3, hair_m, seg=24)
if st == 'long':
    sphere((0, hd * 0.55, -hh * 0.5), (hw * 1.0, hd * 0.45, hh * 1.1), hair_m)
if st == 'bun':
    sphere((0, hd * 0.1, hh * 1.18), (hw * 0.38,) * 3, hair_m)
if st == 'spiky':
    for i in range(7):
        a = (i / 6 - 0.5) * math.pi * 0.9
        bpy.ops.mesh.primitive_cone_add(vertices=24, radius1=hw * 0.2, depth=hh * 0.55,
                                        location=(math.sin(a) * hw * 0.85, hd * 0.1, hh * (0.95 + math.cos(a) * 0.2)),
                                        rotation=(0, a, 0))
        shade(bpy.context.object, hair_m)
if st == 'sidePart':
    sphere((-hw * 0.35, -hd * 0.45, hh * 0.72), (hw * 0.75, hd * 0.55, hh * 0.3), hair_m)

# facial hair
fh = job['facialHair']['style']
fh_m = mat('fh', job['facialHair']['color'], 0.5, 0.2)
if fh == 'moustache':
    sphere((0, -hd * 0.93, -hh * 0.27), (mw * 1.1, hd * 0.07, hh * 0.08), fh_m)
if fh == 'beard':
    sphere((0, -hd * 0.45, -hh * 0.62), (hw * 0.86, hd * 0.62, hh * 0.42), fh_m)
    sphere((0, -hd * 0.93, -hh * 0.27), (mw * 1.1, hd * 0.07, hh * 0.08), fh_m)
if fh == 'stubble':
    sphere((0, -hd * 0.08, -hh * 0.28), (hw * 1.005, hd * 1.005, hh * 0.78), mat('stubble', job['facialHair']['color'], 0.9, 0.0))

# glasses
g = job['glasses']
if g['style'] != 'none':
    gm = mat('glasses', job['glasses']['color'], 0.25, 0.7, 0.4)
    gr = e['r'] * S * 2.6
    ey = face_y(0, ez) - 0.02
    for sx in (-1, 1):
        if g['style'] == 'square':
            torus((sx * gap, ey - 0.08, ez), gr, 0.05, gm, rot=(math.radians(90), 0, 0), scale=(1.05, 1, 0.85))
        else:
            torus((sx * gap, ey - 0.08, ez), gr, 0.05, gm, rot=(math.radians(90), 0, 0))
    tube([(-gap + gr, ey - 0.08, ez), (0, ey - 0.12, ez + gr * 0.2), (gap - gr, ey - 0.08, ez)], 0.05, gm)

# jewellery
ea = job['earrings']
if ea != 'none':
    jm = mat('gold', '#c9a24b', 0.18, 0.6, 1.0)
    for sx in (-1, 1):
        if ea == 'stud':
            sphere((sx * hw * 1.06, -hd * 0.02, -hh * 0.2), (0.07, 0.07, 0.07), jm, seg=24)
        else:
            torus((sx * hw * 1.08, -hd * 0.02, -hh * 0.35), 0.2, 0.04, jm, rot=(0, math.radians(90), 0))
ch = job['chain']
if ch != 'none':
    jm = mat('gold2', '#c9a24b', 0.18, 0.6, 1.0)
    torus((0, -hd * 0.12, -hh * 1.12), hw * 0.62, 0.05 if ch == 'thin' else 0.1, jm, scale=(1, 0.8, 0.7))

# ground shadow catcher is skipped on purpose: the background is transparent.

# ---------------------------------------------------------------- light and camera
def area(name, loc, energy, color=(1, 1, 1), size=6):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy, d.size, d.color = energy, size, color
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    direction = Vector((0, 0, 0)) - Vector(loc)
    o.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()

area('key', (-5, -8, 6), 900, (1, 0.96, 0.9))
area('fill', (6, -7, 1), 300, (0.9, 0.95, 1.0))
area('rim', (0, 8, 5), 500, (1, 1, 1))
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.9, 0.88, 0.85, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.55
scene.world = world

cam = bpy.data.cameras.new('cam')
cam.lens = 70
co = bpy.data.objects.new('cam', cam)
bpy.context.collection.objects.link(co)
co.location = (math.sin(math.radians(-14)) * 15, -math.cos(math.radians(-14)) * 15, 0.4)
co.rotation_euler = (Vector((0, 0, -hh * 0.35)) - Vector(co.location)).to_track_quat('-Z', 'Y').to_euler()
scene.camera = co

scene.render.filepath = out
bpy.ops.render.render(write_still=True)
