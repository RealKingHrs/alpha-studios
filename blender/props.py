"""Renders the studio's 3D props with a transparent background.

Run headless:  blender -b -P blender/props.py -- alpha|trophy out.png
alpha: the logo mark, extruded in glossy ink with a gold flick. trophy: the cup used for certificates.
"""
import bpy, math, sys
from mathutils import Vector

kind, out = sys.argv[sys.argv.index('--') + 1:][:2]


def mat(name, rgb, rough, metal, clear=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*rgb, 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    for key in ('Coat Weight', 'Clearcoat'):
        if key in b.inputs:
            b.inputs[key].default_value = clear
    return m


def smooth(o):
    if o.type == 'MESH':
        for p in o.data.polygons:
            p.use_smooth = True


bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = scene.render.resolution_y = 800
scene.render.film_transparent = True
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
try:
    scene.eevee.taa_render_samples = 48
except Exception:
    pass

gold = mat('gold', (0.79, 0.64, 0.29), 0.2, 1.0, 0.4)
ink = mat('ink', (0.02, 0.017, 0.015), 0.22, 0.0, 0.9)
center = Vector((0, 0, 0))

if kind == 'alpha':
    # The mark drawn as one thick stroke: down through the middle, round the loop, back across, out to the flick.
    stroke = [(1.7, 1.0), (0.9, 0.35), (0.1, -0.5), (-0.7, -0.95), (-1.35, -0.2), (-0.9, 0.75),
              (-0.05, 0.7), (0.75, -0.05), (1.2, -0.7), (1.85, -1.05)]

    def tube(points, radius, m, name):
        c = bpy.data.curves.new(name, 'CURVE')
        c.dimensions = '3D'
        c.bevel_depth = radius
        c.bevel_resolution = 10
        c.use_fill_caps = True
        sp = c.splines.new('BEZIER')
        sp.bezier_points.add(len(points) - 1)
        for bp, p in zip(sp.bezier_points, points):
            bp.co = (p[0], 0, p[1])
            bp.handle_left_type = bp.handle_right_type = 'AUTO'
        o = bpy.data.objects.new(name, c)
        bpy.context.collection.objects.link(o)
        o.data.materials.append(m)
        o.rotation_euler = (0, 0, math.radians(-14))
        return o

    tube(stroke[:8], 0.22, ink, 'alpha')
    tube(stroke[7:], 0.22, gold, 'flick')
    target = Vector((0.2, 0, 0))
else:
    def cyl(loc, r1, r2, d, m):
        bpy.ops.mesh.primitive_cone_add(vertices=64, radius1=r1, radius2=r2, depth=d, location=loc)
        o = bpy.context.object
        o.data.materials.append(m)
        smooth(o)
        return o
    cyl((0, 0, 0.1), 1.0, 1.0, 0.2, ink)           # base
    cyl((0, 0, 0.55), 0.3, 0.3, 0.7, gold)         # stem
    cyl((0, 0, 1.1), 0.25, 0.9, 0.45, gold)        # flare
    cyl((0, 0, 1.9), 0.9, 0.95, 1.2, gold)         # bowl
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(location=(sx * 1.0, 0, 1.9), rotation=(math.radians(90), 0, 0),
                                         major_radius=0.45, minor_radius=0.09, major_segments=48, minor_segments=16)
        t = bpy.context.object
        t.data.materials.append(gold)
        smooth(t)
    bpy.ops.mesh.primitive_uv_sphere_add(location=(0, 0, 2.75), radius=0.28, segments=48, ring_count=24)
    b = bpy.context.object
    b.data.materials.append(gold)
    smooth(b)
    target = Vector((0, 0, 1.35))


def area(name, loc, energy, size=6):
    d = bpy.data.lights.new(name, 'AREA')
    d.energy, d.size = energy, size
    o = bpy.data.objects.new(name, d)
    bpy.context.collection.objects.link(o)
    o.location = loc
    o.rotation_euler = (target - Vector(loc)).to_track_quat('-Z', 'Y').to_euler()


area('key', (-5, -8, 6), 650)
area('fill', (6, -7, 1), 380)
area('rim', (0, 8, 5), 600)
world = bpy.data.worlds.new('w')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.95, 0.92, 0.85, 1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.9
scene.world = world

cam = bpy.data.cameras.new('cam')
cam.lens = 60
co = bpy.data.objects.new('cam', cam)
bpy.context.collection.objects.link(co)
dist = 9 if kind != 'alpha' else 11
co.location = (math.sin(math.radians(-18)) * dist, -math.cos(math.radians(-18)) * dist, target.z + 0.8)
co.rotation_euler = (target - Vector(co.location)).to_track_quat('-Z', 'Y').to_euler()
scene.camera = co
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
